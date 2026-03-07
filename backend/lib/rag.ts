import { OpenAI } from "openai";
import { query } from "./db.js";

let _ai: OpenAI | null = null;
function getAI() {
    if (!_ai) {
        if (process.env.HUGGINGFACE_API_KEY) {
            _ai = new OpenAI({
                baseURL: "https://router.huggingface.co/v1/",
                apiKey: process.env.HUGGINGFACE_API_KEY
            });
        } else {
            _ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        }
    }
    return _ai;
}

/**
 * Smart chatbot: tries OpenAI first, falls back to local NLP-to-SQL if it fails.
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

    // Try AI-powered chat
    try {
        return await openAiChat(message, schemaText, columns, history);
    } catch (err: any) {
        console.error("AI Chat Error:", err);
        const provider = process.env.HUGGINGFACE_API_KEY ? "Hugging Face" : "OpenAI";
        return {
            type: "text",
            text: `⚠️ **Service Unavailable:** The ${provider} service is currently unreachable or has exceeded its quota. Please check your API key or wait a few minutes before trying again.`
        };
    }
}

/**
 * OpenAI-powered chat
 */
async function openAiChat(
    message: string,
    schemaText: string,
    columns: any[],
    history: any[]
): Promise<any> {
    // --- PHASE 1: SQL GENERATION ---
    const systemInstruction1 = `You are a PostgreSQL expert. Convert the user's question into a valid SQL query.
Table: "dataset"
Columns:
${columns.map((c: any) => `- "${c.safeName}" (Type: ${c.sqlType})`).join("\n")}

Rules:
1. ALWAYS double-quote table and column names: "dataset", "ColumnName".
2. Use ILIKE for text searches.
3. Return ONLY a JSON object: { "sql": "...", "visualization": { "type": "bar"|"line"|"pie"|"area", "xAxis": "ColumnName", "yAxis": "ColumnName" } }`;

    const aiConfig1: any = {
        model: process.env.HUGGINGFACE_API_KEY ? "meta-llama/Meta-Llama-3-8B-Instruct" : "gpt-4o-mini",
        messages: [
            { role: "system", content: systemInstruction1 },
            { role: "user", content: message }
        ],
    };
    if (!process.env.HUGGINGFACE_API_KEY) aiConfig1.response_format = { type: "json_object" };

    const result1 = await getAI().chat.completions.create(aiConfig1);
    // Helper to extract FIRST valid JSON object (handles trailing text/multiple blocks)
    function parseFirstJson(text: string) {
        const firstOpen = text.indexOf('{');
        if (firstOpen === -1) return null;

        // Try greedy match first but trim if it fails
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) return null;

        let candidate = match[0];
        try {
            return JSON.parse(candidate);
        } catch (e) {
            // If failed, try walking back from the last '}' to find the matching one
            // or just use a more restricted search if necessary.
            // For now, let's try a simpler fix: pick the first { ... } pair that parses.
            let stack = 0;
            let end = -1;
            for (let i = firstOpen; i < text.length; i++) {
                if (text[i] === '{') stack++;
                if (text[i] === '}') {
                    stack--;
                    if (stack === 0) {
                        end = i;
                        break;
                    }
                }
            }
            if (end !== -1) {
                return JSON.parse(text.substring(firstOpen, end + 1));
            }
            throw e;
        }
    }

    const response1Text = result1.choices[0].message.content || "{}";
    const step1 = parseFirstJson(response1Text);
    if (!step1) {
        return { type: "text", text: "I'm sorry, I couldn't generate a valid query for that question." };
    }

    if (!step1.sql) {
        return { type: "text", text: "I'm sorry, I couldn't generate a query for that question." };
    }

    // --- PHASE 2: EXECUTION ---
    let data: any[] = [];
    try {
        const sqlResult = await query(step1.sql);
        data = sqlResult.rows;
    } catch (e: any) {
        return { type: "text", text: `Database error: ${e.message}`, sql: step1.sql };
    }

    // --- PHASE 3: SUMMARIZATION ---
    const systemInstruction2 = `You are a helpful data assistant. Summarize the following data results to answer the user's question. 
Be concise and professional. If the data is empty, say no records were found. 
Format your response in Markdown.`;

    const userMessage2 = `Question: ${message}
SQL Used: ${step1.sql}
Data Results: ${JSON.stringify(data.slice(0, 20))} ${data.length > 20 ? "(truncated)" : ""}`;

    const aiConfig2: any = {
        model: process.env.HUGGINGFACE_API_KEY ? "meta-llama/Meta-Llama-3-8B-Instruct" : "gpt-4o-mini",
        messages: [
            { role: "system", content: systemInstruction2 },
            { role: "user", content: userMessage2 }
        ],
    };

    const result2 = await getAI().chat.completions.create(aiConfig2);
    const finalAnswer = result2.choices[0].message.content || "Here are the results.";

    return {
        type: step1.visualization ? "visualization" : "query",
        text: finalAnswer,
        sql: step1.sql,
        visualization: step1.visualization,
        data: data
    };
}
