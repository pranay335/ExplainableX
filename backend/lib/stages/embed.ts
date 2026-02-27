import type { PipelineContext } from "../pipeline.js";
import { query, getClient } from "../db.js";

/**
 * Embed stage — uses PostgreSQL full-text search (tsvector) instead of Gemini embeddings.
 * Zero API calls, zero tokens. Rows are chunked and stored as searchable text.
 */

const CHUNK_SIZE = 20;

function chunkRows(rows: Record<string, any>[], size: number): { text: string; indices: number[] }[] {
    const chunks: { text: string; indices: number[] }[] = [];

    for (let i = 0; i < rows.length; i += size) {
        const slice = rows.slice(i, i + size);
        const indices = slice.map((_, j) => i + j);

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
    // Clear old search data
    await query("DELETE FROM dataset_chunks");

    const chunks = chunkRows(ctx.rows, CHUNK_SIZE);
    console.log(`[Index] Indexing ${chunks.length} chunks for full-text search...`);

    const client = await getClient();
    try {
        await client.query("BEGIN");

        for (const chunk of chunks) {
            await client.query(
                `INSERT INTO dataset_chunks (chunk_text, row_indices, search_vector) 
         VALUES ($1, $2, to_tsvector('english', $1))`,
                [chunk.text, chunk.indices]
            );
        }

        await client.query("COMMIT");
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
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

    console.log(`[Index] Stored ${chunks.length} chunks with full-text search index (zero API tokens used)`);
    return ctx;
}
