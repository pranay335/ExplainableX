import type { PipelineContext } from "../pipeline.js";
import { query } from "../db.js";
import { GoogleGenAI } from "@google/genai";

let _ai: InstanceType<typeof GoogleGenAI> | null = null;
function getAI() {
    if (!_ai) _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    return _ai;
}

const CHUNK_SIZE = 20; // rows per chunk

function chunkRows(rows: Record<string, any>[], size: number): { text: string; indices: number[] }[] {
    const chunks: { text: string; indices: number[] }[] = [];

    for (let i = 0; i < rows.length; i += size) {
        const slice = rows.slice(i, i + size);
        const indices = slice.map((_, j) => i + j);

        // Convert rows to readable text representation
        const text = slice
            .map((row, j) => {
                const entries = Object.entries(row)
                    .filter(([_, v]) => v !== null && v !== undefined)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(", ");
                return `Row ${i + j + 1}: ${entries}`;
            })
            .join("\n");

        chunks.push({ text, indices });
    }

    return chunks;
}

export async function embedStage(ctx: PipelineContext): Promise<PipelineContext> {
    // Clear old embeddings
    await query("DELETE FROM dataset_embeddings");

    const chunks = chunkRows(ctx.rows, CHUNK_SIZE);
    console.log(`[Embed] Embedding ${chunks.length} chunks...`);

    // Process in batches of 5 to avoid rate limits
    const BATCH_SIZE = 5;
    for (let b = 0; b < chunks.length; b += BATCH_SIZE) {
        const batch = chunks.slice(b, b + BATCH_SIZE);

        const embedPromises = batch.map(async (chunk) => {
            const result = await getAI().models.embedContent({
                model: "gemini-embedding-001",
                contents: chunk.text,
                config: { taskType: "RETRIEVAL_DOCUMENT" },
            });
            return {
                text: chunk.text,
                indices: chunk.indices,
                embedding: result.embeddings?.[0]?.values || [],
            };
        });

        const results = await Promise.all(embedPromises);

        for (const r of results) {
            if (r.embedding.length > 0) {
                await query(
                    `INSERT INTO dataset_embeddings (chunk_text, row_indices, embedding) VALUES ($1, $2, $3)`,
                    [r.text, r.indices, `[${r.embedding.join(",")}]`]
                );
            }
        }
    }

    // Store metadata
    await query("DELETE FROM dataset_metadata");
    await query(
        `INSERT INTO dataset_metadata (table_name, file_name, row_count, columns, summary_text, warnings) 
     VALUES ($1, $2, $3, $4, $5, $6)`,
        [
            ctx.metadata.tableName,
            ctx.metadata.fileName,
            ctx.metadata.rowCount,
            JSON.stringify(ctx.metadata.columns),
            ctx.metadata.summaryText,
            ctx.metadata.warnings,
        ]
    );

    console.log(`[Embed] Stored ${chunks.length} embeddings in pgvector`);
    return ctx;
}
