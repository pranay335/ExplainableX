import type { PipelineContext } from "../pipeline.js";

const NULL_VALUES = new Set(["", "null", "NULL", "nil", "NIL", "N/A", "n/a", "NA", "na", "NaN", "nan", "undefined", "-", "--", "none", "None", "NONE"]);

export async function cleanStage(ctx: PipelineContext): Promise<PipelineContext> {
    let droppedRows = 0;
    let nullsNormalized = 0;

    ctx.rows = ctx.rows
        .map((row) => {
            const cleanedRow: Record<string, any> = {};
            for (const [key, value] of Object.entries(row)) {
                if (typeof value === "string") {
                    const trimmed = value.trim();
                    if (NULL_VALUES.has(trimmed)) {
                        cleanedRow[key] = null;
                        nullsNormalized++;
                    } else {
                        cleanedRow[key] = trimmed;
                    }
                } else {
                    cleanedRow[key] = value;
                }
            }
            return cleanedRow;
        })
        .filter((row) => {
            // Drop rows where ALL values are null
            const allNull = Object.values(row).every((v) => v === null || v === undefined);
            if (allNull) droppedRows++;
            return !allNull;
        });

    if (droppedRows > 0) {
        ctx.warnings.push(`Removed ${droppedRows} fully empty rows`);
    }
    if (nullsNormalized > 0) {
        ctx.warnings.push(`Normalized ${nullsNormalized} null-like values`);
    }

    console.log(`[Clean] ${ctx.rows.length} rows after cleaning (dropped ${droppedRows}, normalized ${nullsNormalized} nulls)`);
    return ctx;
}
