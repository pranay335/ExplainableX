import Papa from "papaparse";
import type { PipelineContext } from "../pipeline.js";

export async function parseStage(ctx: PipelineContext): Promise<PipelineContext> {
    if (ctx.fileType === "csv") {
        const csvString = ctx.rawBuffer.toString("utf-8");
        const result = Papa.parse(csvString, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
        });

        if (result.errors.length > 0) {
            ctx.warnings.push(
                ...result.errors.slice(0, 5).map(
                    (e: any) => `Parse warning (row ${e.row}): ${e.message}`
                )
            );
        }

        ctx.rows = result.data as Record<string, any>[];
    } else {
        // JSON
        const jsonString = ctx.rawBuffer.toString("utf-8");
        const parsed = JSON.parse(jsonString);

        if (Array.isArray(parsed)) {
            ctx.rows = parsed;
        } else if (parsed && typeof parsed === "object") {
            // If it's an object with a data array, try common keys
            const dataKey = Object.keys(parsed).find(
                (k) => Array.isArray(parsed[k])
            );
            if (dataKey) {
                ctx.rows = parsed[dataKey];
                ctx.warnings.push(`JSON: extracted array from key "${dataKey}"`);
            } else {
                ctx.rows = [parsed]; // single object → single row
                ctx.warnings.push("JSON: single object wrapped as one row");
            }
        }
    }

    if (ctx.rows.length === 0) {
        throw new Error("No data rows found after parsing.");
    }

    console.log(`[Parse] ${ctx.rows.length} rows parsed from ${ctx.fileType}`);
    return ctx;
}
