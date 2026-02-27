import { GoogleGenAI } from "@google/genai";
import { query } from "./db.js";

let _ai: InstanceType<typeof GoogleGenAI> | null = null;
function getAI() {
    if (!_ai) _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    return _ai;
}

/**
 * Smart chatbot: tries Gemini first, falls back to local NLP-to-SQL if rate limited.
 */
export async function ragChat(
    message: string,
    schema: string,
    history: any[]
): Promise<{
    type: "query" | "text" | "visualization";
    text: string;
    sql?: string;
    visualization?: any;
    data?: any[];
}> {
    // Get metadata
    const metaResult = await query("SELECT * FROM dataset_metadata LIMIT 1");
    const meta = metaResult.rows[0];

    if (!meta) {
        return { type: "text", text: "No dataset is loaded. Please upload a CSV or JSON file first." };
    }

    const columns: any[] = typeof meta.columns === "string" ? JSON.parse(meta.columns) : meta.columns;
    const columnNames = columns.map((c: any) => c.safeName);
    const schemaText = meta.summary_text || schema;

    // Try Gemini first, fall back to local NLP-to-SQL
    try {
        return await geminiChat(message, schemaText, columns, history);
    } catch (err: any) {
        console.log(`Gemini unavailable (${err.status || err.message}), using local NLP-to-SQL...`);
        return await localNlpToSql(message, columns, columnNames);
    }
}

/**
 * Gemini-powered chat (used when API is available)
 */
async function geminiChat(
    message: string,
    schemaText: string,
    columns: any[],
    history: any[]
): Promise<any> {
    // Get relevant data context via full-text search
    const searchTerms = message
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2)
        .join(" & ");

    let retrievedContext = "";
    if (searchTerms) {
        try {
            const result = await query(
                `SELECT chunk_text, ts_rank(search_vector, to_tsquery('english', $1)) AS rank
         FROM dataset_chunks
         WHERE search_vector @@ to_tsquery('english', $1)
         ORDER BY rank DESC LIMIT 10`,
                [searchTerms]
            );
            retrievedContext = result.rows.map((r: any) => r.chunk_text).join("\n\n");
        } catch { }
    }

    const systemInstruction = `You are an expert PostgreSQL Database Administrator and Data Analyst. Your primary goal is to convert natural language questions into valid PostgreSQL queries to retrieve the correct data, and to explain those results.

Here is the exact schema for the table you will query (table name is ALWAYS "dataset"):
---
COLUMNS:
${columns.map((c: any) => `- "${c.safeName}" (Type: ${c.sqlType})`).join("\n")}

DATABASE SUMMARY/DESCRIPTION: 
${schemaText}
---

RETRIEVED CONTEXT FROM VECTOR SEARCH:
${retrievedContext || "No exact matching text found in DB chunks."}

CRITICAL RULES:
1. Try to generate a valid PostgreSQL query to answer the user's question dynamically. Use aggregate functions (COUNT, SUM, AVG) where appropriate. 
2. If the question asks for a chart/graph, include visualization config.
3. ALWAYS return exactly this JSON format:
{
  "type": "query" | "text" | "visualization",
  "text": "A brief explanation of what the query is doing, or the direct answer.",
  "sql": "SELECT ... (Your PostgreSQL query)",
  "visualization": { "type": "bar" | "pie" | "line", "xAxis": "col_name", "yAxis": "col_name", "title": "Chart Title" } // Only if a chart was requested or makes sense
}`;

    const chatHistory = (history || []).map((h: any) => ({ role: h.role, parts: h.parts }));
    chatHistory.push({ role: "user", parts: [{ text: message }] });

    const result = await getAI().models.generateContent({
        model: "gemini-2.0-flash",
        config: { systemInstruction, responseMimeType: "application/json" },
        contents: chatHistory,
    });

    let responseText = (result.text || "").replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(responseText);

    // Execute SQL if present
    if (parsed.sql) {
        try {
            const sqlResult = await query(parsed.sql);
            parsed.data = sqlResult.rows;
        } catch (e: any) {
            parsed.text += ` (SQL execution note: ${e.message})`;
        }
    }

    return parsed;
}

/**
 * Local NLP-to-SQL engine — works offline, zero API tokens.
 * Parses natural language into SQL using pattern matching.
 */
async function localNlpToSql(
    message: string,
    columns: any[],
    columnNames: string[]
): Promise<any> {
    const msg = message.toLowerCase().trim();
    const numericCols = columns.filter((c: any) => c.sqlType === "REAL" || c.sqlType === "INTEGER");
    const textCols = columns.filter((c: any) => c.sqlType === "TEXT");

    let sql = "";
    let text = "";
    let vizConfig: any = null;

    // --- Pattern: "show top N" / "first N rows" / "show me the data" ---
    const topMatch = msg.match(/(?:show|display|get|list|first|top)\s*(\d+)?/);
    if (topMatch && (msg.includes("row") || msg.includes("data") || msg.includes("record") || msg.includes("sample") || msg.includes("top") || msg.includes("first"))) {
        const n = parseInt(topMatch[1]) || 10;
        sql = `SELECT * FROM "dataset" LIMIT ${n}`;
        text = `Here are the ${n > 1 ? `first ${n}` : "first"} rows from the dataset.`;
    }

    // --- Pattern: "count" / "how many" ---
    else if (msg.includes("count") || msg.includes("how many") || msg.includes("total number")) {
        const groupCol = findMatchingColumn(msg, textCols);
        if (groupCol) {
            sql = `SELECT "${groupCol}", COUNT(*) as count FROM "dataset" WHERE "${groupCol}" IS NOT NULL GROUP BY "${groupCol}" ORDER BY count DESC NULLS LAST`;
            text = `Here's the count of records grouped by ${groupCol}.`;
            vizConfig = { type: "bar", xAxis: groupCol, yAxis: "count", title: `Count by ${groupCol}` };
        } else {
            sql = `SELECT COUNT(*) as total FROM "dataset"`;
            text = `Total number of records in the dataset.`;
        }
    }

    // --- Pattern: "average" / "mean" ---
    else if (msg.includes("average") || msg.includes("avg") || msg.includes("mean")) {
        const numCol = findMatchingColumn(msg, numericCols) || numericCols[0]?.safeName;
        const groupCol = findMatchingColumn(msg, textCols);
        if (numCol && groupCol) {
            sql = `SELECT "${groupCol}", ROUND(AVG("${numCol}")::numeric, 2) as avg_${numCol} FROM "dataset" WHERE "${groupCol}" IS NOT NULL GROUP BY "${groupCol}" ORDER BY avg_${numCol} DESC NULLS LAST`;
            text = `Average ${numCol} grouped by ${groupCol}.`;
            vizConfig = { type: "bar", xAxis: groupCol, yAxis: `avg_${numCol}`, title: `Average ${numCol} by ${groupCol}` };
        } else if (numCol) {
            sql = `SELECT ROUND(AVG("${numCol}")::numeric, 2) as average FROM "dataset"`;
            text = `The average value of ${numCol}.`;
        }
    }

    // --- Pattern: "sum" / "total" ---
    else if (msg.includes("sum") || (msg.includes("total") && !msg.includes("total number"))) {
        const numCol = findMatchingColumn(msg, numericCols) || numericCols[0]?.safeName;
        const groupCol = findMatchingColumn(msg, textCols);
        if (numCol && groupCol) {
            sql = `SELECT "${groupCol}", SUM("${numCol}") as total_${numCol} FROM "dataset" WHERE "${groupCol}" IS NOT NULL GROUP BY "${groupCol}" ORDER BY total_${numCol} DESC NULLS LAST`;
            text = `Sum of ${numCol} grouped by ${groupCol}.`;
            vizConfig = { type: "bar", xAxis: groupCol, yAxis: `total_${numCol}`, title: `Total ${numCol} by ${groupCol}` };
        } else if (numCol) {
            sql = `SELECT SUM("${numCol}") as total FROM "dataset"`;
            text = `The total sum of ${numCol}.`;
        }
    }

    // --- Pattern: "max" / "maximum" / "highest" ---
    else if (msg.includes("max") || msg.includes("highest") || msg.includes("largest") || msg.includes("biggest")) {
        const numCol = findMatchingColumn(msg, numericCols) || numericCols[0]?.safeName;
        if (numCol) {
            sql = `SELECT * FROM "dataset" WHERE "${numCol}" IS NOT NULL ORDER BY "${numCol}" DESC NULLS LAST LIMIT 5`;
            text = `Records with the highest ${numCol} values.`;
        }
    }

    // --- Pattern: "min" / "minimum" / "lowest" ---
    else if (msg.includes("min") || msg.includes("lowest") || msg.includes("smallest")) {
        const numCol = findMatchingColumn(msg, numericCols) || numericCols[0]?.safeName;
        if (numCol) {
            sql = `SELECT * FROM "dataset" WHERE "${numCol}" IS NOT NULL ORDER BY "${numCol}" ASC LIMIT 5`;
            text = `Records with the lowest ${numCol} values.`;
        }
    }

    // --- Pattern: "distribution" / "breakdown" ---
    else if (msg.includes("distribution") || msg.includes("breakdown") || msg.includes("group")) {
        const groupCol = findMatchingColumn(msg, textCols) || textCols[0]?.safeName;
        if (groupCol) {
            sql = `SELECT "${groupCol}", COUNT(*) as count FROM "dataset" WHERE "${groupCol}" IS NOT NULL GROUP BY "${groupCol}" ORDER BY count DESC NULLS LAST`;
            text = `Distribution of records by ${groupCol}.`;
            vizConfig = { type: "pie", xAxis: groupCol, yAxis: "count", title: `Distribution by ${groupCol}` };
        }
    }

    // --- Pattern: "visualize" / "chart" / "plot" / "graph" ---
    else if (msg.includes("visualize") || msg.includes("chart") || msg.includes("plot") || msg.includes("graph")) {
        const numCol = findMatchingColumn(msg, numericCols) || numericCols[0]?.safeName;
        const groupCol = findMatchingColumn(msg, textCols) || textCols[0]?.safeName;
        if (numCol && groupCol) {
            sql = `SELECT "${groupCol}", AVG("${numCol}")::numeric as avg_val FROM "dataset" WHERE "${groupCol}" IS NOT NULL GROUP BY "${groupCol}" ORDER BY avg_val DESC NULLS LAST LIMIT 15`;
            text = `Visualization of ${numCol} by ${groupCol}.`;
            vizConfig = { type: "bar", xAxis: groupCol, yAxis: "avg_val", title: `${numCol} by ${groupCol}` };
        }
    }

    // --- Pattern: "unique" / "distinct" ---
    else if (msg.includes("unique") || msg.includes("distinct")) {
        const col = findMatchingColumn(msg, columns) || textCols[0]?.safeName;
        if (col) {
            sql = `SELECT DISTINCT "${col}" FROM "dataset" WHERE "${col}" IS NOT NULL ORDER BY "${col}" LIMIT 50`;
            text = `Unique values in the ${col} column.`;
        }
    }

    // --- Pattern: "describe" / "summary" / "statistics" / "info" ---
    else if (msg.includes("describe") || msg.includes("summary") || msg.includes("statistic") || msg.includes("info") || msg.includes("schema") || msg.includes("columns")) {
        const stats = columns.map((c: any) => {
            let desc = `• **${c.originalName}** (${c.sqlType}) — ${c.uniqueCount} unique, ${c.nullCount} nulls`;
            if (c.min !== undefined) desc += `, range: ${c.min} to ${c.max}`;
            return desc;
        }).join("\n");
        return {
            type: "text",
            text: `**Dataset Summary**\n\nThe dataset has **${columns.length} columns**.\n\n${stats}`,
        };
    }

    // --- Pattern: "where" / filter by value ---
    else if (msg.includes("where") || msg.includes("filter") || msg.includes("find")) {
        const col = findMatchingColumn(msg, columns);
        if (col) {
            // Try to extract the filter value from the message
            const valueMatch = msg.match(/(?:where|=|is|equals?|with|having|filter)\s+(?:["']?)([^"'\s,]+)/i);
            if (valueMatch) {
                const val = valueMatch[1];
                sql = `SELECT * FROM "dataset" WHERE "${col}"::TEXT ILIKE '%${val}%' LIMIT 20`;
                text = `Records where ${col} contains "${val}".`;
            } else {
                sql = `SELECT "${col}", COUNT(*) as count FROM "dataset" WHERE "${col}" IS NOT NULL GROUP BY "${col}" ORDER BY count DESC NULLS LAST`;
                text = `Values in the ${col} column.`;
            }
        }
    }

    // --- Fallback: try to find any mentioned column and show stats ---
    if (!sql) {
        const mentionedCol = findMatchingColumn(msg, columns);
        if (mentionedCol) {
            const colInfo = columns.find((c: any) => c.safeName === mentionedCol);
            if (colInfo?.sqlType === "TEXT") {
                sql = `SELECT "${mentionedCol}", COUNT(*) as count FROM "dataset" WHERE "${mentionedCol}" IS NOT NULL GROUP BY "${mentionedCol}" ORDER BY count DESC NULLS LAST LIMIT 15`;
                text = `Here's a breakdown of the ${mentionedCol} column.`;
                vizConfig = { type: "bar", xAxis: mentionedCol, yAxis: "count", title: `${mentionedCol} Distribution` };
            } else {
                sql = `SELECT MIN("${mentionedCol}") as min, MAX("${mentionedCol}") as max, ROUND(AVG("${mentionedCol}")::numeric, 2) as avg, COUNT("${mentionedCol}") as count FROM "dataset"`;
                text = `Statistics for the ${mentionedCol} column.`;
            }
        } else {
            // Ultimate fallback: show first rows
            sql = `SELECT * FROM "dataset" LIMIT 5`;
            text = `I understood your question but couldn't match specific columns. Here are the first 5 rows. Try asking about specific columns like: ${columnNames.slice(0, 4).join(", ")}`;
        }
    }

    // Execute the SQL
    let data: any[] = [];
    try {
        const result = await query(sql);
        data = result.rows;

        // Enhance text with result summary
        if (data.length === 1 && Object.keys(data[0]).length <= 3) {
            const vals = Object.entries(data[0]).map(([k, v]) => `${k}: **${v}**`).join(", ");
            text += `\n\nResult: ${vals}`;
        } else {
            text += `\n\n*Retrieved ${data.length} records.*`;
        }
    } catch (e: any) {
        text = `I tried to query the data but encountered an error: ${e.message}. Try rephrasing your question.`;
        sql = "";
    }

    const response: any = {
        type: vizConfig ? "visualization" : (data.length > 0 ? "query" : "text"),
        text,
        sql: sql || undefined,
        data,
    };

    if (vizConfig) response.visualization = vizConfig;
    return response;
}

/**
 * Find the best matching column name from user message
 * Scores by match quality — prefers longer and full-name matches.
 */
function findMatchingColumn(msg: string, cols: any[]): string | null {
    const msgLower = msg.toLowerCase();
    const noiseWords = new Set(["show", "me", "the", "top", "how", "many", "what", "is", "are", "by", "of", "in", "for", "a", "an", "to", "and", "or", "from", "with", "get", "find", "where", "count", "average", "sum", "total", "min", "max", "display", "list", "all"]);

    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const col of cols) {
        const name = (col.safeName || col.originalName || "").toLowerCase();
        const originalName = (col.originalName || col.safeName || "").toLowerCase();

        // Full name match (highest priority)
        if (msgLower.includes(name) && name.length > 2) {
            const score = name.length * 10;
            if (score > bestScore) { bestScore = score; bestMatch = col.safeName; }
        }

        // Original name match (e.g. "Property Area" vs "Property_Area")
        const readableName = originalName.replace(/[_]/g, " ");
        if (readableName !== name && msgLower.includes(readableName) && readableName.length > 2) {
            const score = readableName.length * 10;
            if (score > bestScore) { bestScore = score; bestMatch = col.safeName; }
        }

        // Word-level match (lower priority, skip noise words)
        const words = name.split(/[_\s]+/).filter((w: string) => w.length > 3 && !noiseWords.has(w));
        for (const word of words) {
            if (msgLower.includes(word)) {
                const score = word.length;
                if (score > bestScore) { bestScore = score; bestMatch = col.safeName; }
            }
        }
    }

    return bestMatch;
}
