export interface ColumnInfo {
    originalName: string;
    safeName: string;
    sqlType: "TEXT" | "REAL" | "INTEGER";
    nullCount: number;
    uniqueCount: number;
    min?: number | string;
    max?: number | string;
    sampleValues: any[];
}

export interface DatasetMetadata {
    tableName: string;
    fileName: string;
    rowCount: number;
    columns: ColumnInfo[];
    summaryText: string;
    warnings: string[];
}

export interface PipelineContext {
    rawBuffer: Buffer;
    fileName: string;
    fileType: "csv" | "json";
    rows: Record<string, any>[];
    columns: ColumnInfo[];
    warnings: string[];
    metadata: DatasetMetadata;
}

export type PipelineStage = (ctx: PipelineContext) => Promise<PipelineContext>;

export async function runPipeline(
    file: { buffer: Buffer; originalname: string; mimetype: string },
    stages: PipelineStage[]
): Promise<PipelineContext> {
    const fileType = file.mimetype === "application/json" || file.originalname.endsWith(".json")
        ? "json"
        : "csv";

    let ctx: PipelineContext = {
        rawBuffer: file.buffer,
        fileName: file.originalname,
        fileType,
        rows: [],
        columns: [],
        warnings: [],
        metadata: {
            tableName: "dataset",
            fileName: file.originalname,
            rowCount: 0,
            columns: [],
            summaryText: "",
            warnings: [],
        },
    };

    for (const stage of stages) {
        ctx = await stage(ctx);
    }

    return ctx;
}
