import type { PipelineContext } from "../pipeline.js";
import { query, getClient } from "../db.js";

const PG_TYPE_MAP: Record<string, string> = {
    TEXT: "TEXT",
    REAL: "DOUBLE PRECISION",
    INTEGER: "BIGINT",
};

export async function storeStage(ctx: PipelineContext): Promise<PipelineContext> {
    const tableName = ctx.metadata.tableName;
    const columns = ctx.columns;

    // Drop existing table
    await query(`DROP TABLE IF EXISTS "${tableName}"`);

    // Create table
    const columnDefs = columns
        .map((c) => `"${c.safeName}" ${PG_TYPE_MAP[c.sqlType] || "TEXT"}`)
        .join(", ");

    await query(`CREATE TABLE "${tableName}" (${columnDefs})`);

    // Bulk insert using transactions
    const client = await getClient();
    try {
        await client.query("BEGIN");

        const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
        const insertSQL = `INSERT INTO "${tableName}" (${columns.map((c) => `"${c.safeName}"`).join(", ")}) VALUES (${placeholders})`;

        for (const row of ctx.rows) {
            const values = columns.map((c) => {
                const val = row[c.originalName];
                return val === undefined ? null : val;
            });
            await client.query(insertSQL, values);
        }

        await client.query("COMMIT");
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }

    ctx.metadata.rowCount = ctx.rows.length;
    ctx.metadata.columns = ctx.columns;

    // Build summary text for Gemini context
    const colSummaries = columns.map((c) => {
        let summary = `"${c.safeName}" (${c.sqlType})`;
        if (c.nullCount > 0) summary += `, ${c.nullCount} nulls`;
        summary += `, ${c.uniqueCount} unique`;
        if (c.min !== undefined) summary += `, range [${c.min} - ${c.max}]`;
        if (c.sampleValues.length > 0) summary += `, samples: ${JSON.stringify(c.sampleValues.slice(0, 3))}`;
        return summary;
    });

    ctx.metadata.summaryText = [
        `Table "${tableName}" has ${ctx.rows.length} rows and ${columns.length} columns.`,
        `Columns: ${colSummaries.join("; ")}`,
    ].join("\n");

    ctx.metadata.warnings = ctx.warnings;

    console.log(`[Store] Inserted ${ctx.rows.length} rows into PostgreSQL table "${tableName}"`);
    return ctx;
}
