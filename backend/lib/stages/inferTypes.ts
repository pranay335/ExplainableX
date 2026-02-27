import type { PipelineContext, ColumnInfo } from "../pipeline.js";

export async function inferTypesStage(ctx: PipelineContext): Promise<PipelineContext> {
    if (ctx.rows.length === 0) throw new Error("No rows to infer types from");

    const allKeys = new Set<string>();
    for (const row of ctx.rows) {
        for (const key of Object.keys(row)) {
            allKeys.add(key);
        }
    }

    const columns: ColumnInfo[] = [];

    for (const key of allKeys) {
        const safeName = key.replace(/[^a-zA-Z0-9_]/g, "_").replace(/^(\d)/, "_$1");

        let nullCount = 0;
        const uniqueValues = new Set<any>();
        let allNumeric = true;
        let allInteger = true;
        let numericValues: number[] = [];

        for (const row of ctx.rows) {
            const val = row[key];
            if (val === null || val === undefined) {
                nullCount++;
                continue;
            }

            uniqueValues.add(val);

            if (typeof val === "number") {
                numericValues.push(val);
                if (!Number.isInteger(val)) allInteger = false;
            } else if (typeof val === "string") {
                const num = Number(val);
                if (!isNaN(num) && val !== "") {
                    numericValues.push(num);
                    if (!Number.isInteger(num)) allInteger = false;
                } else {
                    allNumeric = false;
                    allInteger = false;
                }
            } else if (typeof val === "boolean") {
                // treat as integer
                numericValues.push(val ? 1 : 0);
                allNumeric = true;
            } else {
                allNumeric = false;
                allInteger = false;
            }
        }

        const nonNullCount = ctx.rows.length - nullCount;
        let sqlType: "TEXT" | "REAL" | "INTEGER" = "TEXT";

        if (nonNullCount > 0 && allNumeric) {
            sqlType = allInteger ? "INTEGER" : "REAL";
        }

        // Coerce numeric string values to actual numbers
        if (sqlType !== "TEXT") {
            for (const row of ctx.rows) {
                if (row[key] !== null && row[key] !== undefined) {
                    row[key] = Number(row[key]);
                }
            }
        }

        const sampleValues = Array.from(uniqueValues).slice(0, 5);

        const col: ColumnInfo = {
            originalName: key,
            safeName,
            sqlType,
            nullCount,
            uniqueCount: uniqueValues.size,
            sampleValues,
        };

        if (numericValues.length > 0) {
            col.min = Math.min(...numericValues);
            col.max = Math.max(...numericValues);
        }

        columns.push(col);
    }

    ctx.columns = columns;
    console.log(`[InferTypes] ${columns.length} columns: ${columns.map(c => `${c.safeName}(${c.sqlType})`).join(", ")}`);
    return ctx;
}
