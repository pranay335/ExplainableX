import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, "../.env") });

import express from "express";
import multer from "multer";
import { initDB, query } from "./lib/db.js";
import { runPipeline } from "./lib/pipeline.js";
import { parseStage } from "./lib/stages/parse.js";
import { cleanStage } from "./lib/stages/clean.js";
import { inferTypesStage } from "./lib/stages/inferTypes.js";
import { storeStage } from "./lib/stages/store.js";
import { embedStage } from "./lib/stages/embed.js";
import { ragChat } from "./lib/rag.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

async function startServer() {
  // Initialize database tables + pgvector
  await initDB();

  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // CORS for frontend dev server
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:5173");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  // ==================== API ROUTES ====================

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // ---- DATA UPLOAD (Pipeline) ----
  app.post("/api/data/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      console.log(`\n=== Upload Pipeline Start: ${req.file.originalname} ===`);

      const result = await runPipeline(req.file, [
        parseStage,
        cleanStage,
        inferTypesStage,
        storeStage,
        embedStage,
      ]);

      console.log(`=== Upload Pipeline Complete ===\n`);

      res.json({
        success: true,
        schema: result.metadata.summaryText,
        rowCount: result.metadata.rowCount,
        columns: result.metadata.columns,
        warnings: result.warnings,
        fileName: result.fileName,
      });
    } catch (error: any) {
      console.error("Upload Pipeline Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ---- DATASET SCHEMA + STATS ----
  app.get("/api/data/schema", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      const meta = await query("SELECT * FROM dataset_metadata ORDER BY created_at DESC LIMIT 1");
      if (meta.rows.length === 0) {
        return res.json({ loaded: false });
      }

      const row = meta.rows[0];
      res.json({
        loaded: true,
        tableName: row.table_name,
        fileName: row.file_name,
        rowCount: row.row_count,
        columns: row.columns,
        summaryText: row.summary_text,
        warnings: row.warnings,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ---- DATA PREVIEW ----
  app.get("/api/data/preview", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      const limit = parseInt(req.query.limit as string) || 100;

      // Check if table exists
      const tableCheck = await query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dataset')`
      );
      if (!tableCheck.rows[0]?.exists) {
        return res.json({ rows: [], total: 0 });
      }

      const result = await query(`SELECT * FROM "dataset" LIMIT $1`, [limit]);
      const countResult = await query(`SELECT COUNT(*) as total FROM "dataset"`);

      res.json({
        rows: result.rows,
        total: parseInt(countResult.rows[0].total),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ---- DIRECT SQL QUERY ----
  app.post("/api/query", async (req, res) => {
    try {
      const { sql } = req.body;
      if (!sql.trim().toLowerCase().startsWith("select")) {
        return res.status(400).json({ error: "Only SELECT queries are allowed." });
      }

      const result = await query(sql);
      res.json({ results: result.rows });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ---- RAG CHAT (Grounded to Dataset) ----
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, schema, history } = req.body;

      // Get schema from DB if not provided
      let schemaText = schema;
      if (!schemaText) {
        const meta = await query("SELECT summary_text FROM dataset_metadata LIMIT 1");
        schemaText = meta.rows[0]?.summary_text || "";
      }

      const result = await ragChat(message, schemaText, history || []);
      res.json(result);
    } catch (error: any) {
      console.error("RAG Chat Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ---- REPORT GENERATION ----
  app.post("/api/report", async (req, res) => {
    try {
      const { conversation } = req.body;
      const { OpenAI } = await import("openai");
      const useHuggingFace = !!process.env.HUGGINGFACE_API_KEY;
      const localAi = useHuggingFace
        ? new OpenAI({ baseURL: "https://router.huggingface.co/v1/", apiKey: process.env.HUGGINGFACE_API_KEY })
        : new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const result = await localAi.chat.completions.create({
        model: useHuggingFace ? "meta-llama/Meta-Llama-3-8B-Instruct" : "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a reporting assistant. Summarize the following data analysis conversation into a professional executive summary report in Markdown format. Highlight key insights found. Only include facts supported by the data discussed." },
          { role: "user", content: JSON.stringify(conversation) }
        ]
      });

      res.json({ report: result.choices[0].message.content });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== START SERVER ====================
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
