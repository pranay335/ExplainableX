import { GoogleGenAI } from "@google/genai";
import { query } from "./db.js";

let _ai: InstanceType<typeof GoogleGenAI> | null = null;
function getAI() {
    if (!_ai) _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    return _ai;
}

/**
 * RAG-powered chat: embed query → pgvector search → ground Gemini response
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
    retrievedContext?: string;
}> {
    // 1. Embed user query
    const queryEmbedding = await getAI().models.embedContent({
        model: "gemini-embedding-001",
        contents: message,
        config: { taskType: "RETRIEVAL_QUERY" },
    });

    const embedding = queryEmbedding.embeddings?.[0]?.values || [];

    // 2. pgvector similarity search — get top 10 relevant chunks
    let retrievedContext = "";
    if (embedding.length > 0) {
        const vectorQuery = `
      SELECT chunk_text, 1 - (embedding <=> $1::vector) AS similarity
      FROM dataset_embeddings
      ORDER BY embedding <=> $1::vector
      LIMIT 10
    `;
        const result = await query(vectorQuery, [`[${embedding.join(",")}]`]);
        retrievedContext = result.rows
            .map((r: any) => r.chunk_text)
            .join("\n\n");
    }

    // 3. Get dataset metadata for context
    const metaResult = await query("SELECT summary_text FROM dataset_metadata LIMIT 1");
    const summaryText = metaResult.rows[0]?.summary_text || schema;

    // 4. Build strict grounding prompt
    const systemInstruction = `
You are a precise data analyst. You MUST follow these rules strictly:

RULE 1: Answer ONLY using the provided data context below. 
RULE 2: If the answer CANNOT be found in the provided data, respond with: "This information is not available in the uploaded dataset."
RULE 3: NEVER make up, infer, or hallucinate any data, statistics, or facts not present in the context.
RULE 4: Every claim must be directly supported by the retrieved data rows.
RULE 5: When generating SQL, use PostgreSQL syntax. The table name is 'dataset'.

DATABASE INFO:
${summaryText}

SCHEMA: ${schema}

RETRIEVED DATA CONTEXT (from the uploaded dataset):
${retrievedContext || "No matching data found for this query."}

RESPONSE FORMAT (return valid JSON only):
{
  "type": "query" | "text" | "visualization",
  "text": "Your explanation based ONLY on the data above",
  "sql": "SELECT ... (PostgreSQL syntax, only if type is query or visualization)",
  "visualization": {
    "type": "bar" | "line" | "pie" | "scatter" | "area",
    "xAxis": "column_name",
    "yAxis": "column_name",
    "title": "Chart Title"
  }
}
`;

    // 5. Call Gemini with grounded context
    const model = getAI().models.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction,
        generationConfig: {
            responseMimeType: "application/json",
        },
    });

    const chatSession = model.startChat({
        history: history || [],
    });

    const result = await chatSession.sendMessage(message);
    let responseText = result.response.text();

    // Clean markdown wrappers
    responseText = responseText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

    const parsed = JSON.parse(responseText);
    parsed.retrievedContext = retrievedContext ? "(data grounded)" : "(no matching context)";

    return parsed;
}
