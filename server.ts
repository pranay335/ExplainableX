import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import { GoogleGenAI } from "@google/genai";

// Initialize Database
const db = new Database(":memory:");

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // --- API Routes ---

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Initialize Data (Upload)
  // Expects { tableName: string, data: any[] }
  app.post("/api/data/init", (req, res) => {
    try {
      const { tableName, data } = req.body;
      if (!data || !Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ error: "Invalid data provided" });
      }

      // 1. Drop table if exists
      db.prepare(`DROP TABLE IF EXISTS ${tableName}`).run();

      // 2. Infer schema from first row
      const firstRow = data[0];
      const columns = Object.keys(firstRow).map((key) => {
        const val = firstRow[key];
        let type = "TEXT";
        if (typeof val === "number") type = "REAL";
        if (typeof val === "boolean") type = "INTEGER";
        // Sanitize column name (simple regex for demo)
        const safeKey = key.replace(/[^a-zA-Z0-9_]/g, "_");
        return `${safeKey} ${type}`;
      });

      const createTableSQL = `CREATE TABLE ${tableName} (${columns.join(", ")})`;
      db.prepare(createTableSQL).run();

      // 3. Insert data
      const safeKeys = Object.keys(firstRow).map((key) =>
        key.replace(/[^a-zA-Z0-9_]/g, "_")
      );
      const insertSQL = `INSERT INTO ${tableName} (${safeKeys.join(
        ", "
      )}) VALUES (${safeKeys.map(() => "?").join(", ")})`;
      const insert = db.prepare(insertSQL);

      const insertMany = db.transaction((rows) => {
        for (const row of rows) {
          insert.run(...Object.values(row));
        }
      });

      insertMany(data);

      // Get schema info for the AI
      const schemaInfo = columns.join(", ");

      res.json({ success: true, schema: schemaInfo, rowCount: data.length });
    } catch (error: any) {
      console.error("Init Data Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Execute SQL Query
  app.post("/api/query", (req, res) => {
    try {
      const { sql } = req.body;
      // Basic guardrail: only allow SELECT
      if (!sql.trim().toLowerCase().startsWith("select")) {
        return res
          .status(400)
          .json({ error: "Only SELECT queries are allowed." });
      }

      const stmt = db.prepare(sql);
      const results = stmt.all();
      res.json({ results });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Chat / Intent Detection / SQL Generation
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, schema, history } = req.body;

      // Construct prompt
      const systemInstruction = `
        You are an expert data analyst and SQL developer.
        Your goal is to answer user questions about their dataset.
        
        The database is SQLite.
        The table name is 'dataset'.
        The schema is: ${schema}

        Rules:
        1. If the user asks for data, generate a valid SQLite SELECT query.
        2. If the user asks for a visualization, suggest the best chart type (bar, line, pie, scatter, area) and the data to plot.
        3. Return the response in JSON format ONLY.
        
        Response Format:
        {
          "type": "query" | "text" | "visualization",
          "text": "Explanation or answer text",
          "sql": "SELECT ...", // Only if type is query or visualization
          "visualization": { // Only if type is visualization
            "type": "bar" | "line" | "pie" | "scatter" | "area",
            "xAxis": "column_name",
            "yAxis": "column_name", // or array of columns
            "title": "Chart Title"
          }
        }
      `;

      const model = ai.models.getGenerativeModel({
        model: "gemini-3-flash-preview",
        systemInstruction: systemInstruction,
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      const chatSession = model.startChat({
        history: history || [],
      });

      const result = await chatSession.sendMessage(message);
      let responseText = result.response.text();
      
      // Clean markdown code blocks if present
      responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();

      res.json(JSON.parse(responseText));
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate Report
  app.post("/api/report", async (req, res) => {
    try {
        const { conversation } = req.body;
        // Simple logic: summarize the conversation
        const model = ai.models.getGenerativeModel({
            model: "gemini-3-flash-preview",
            systemInstruction: "You are a reporting assistant. Summarize the following data analysis conversation into a professional executive summary report in Markdown format. Highlight key insights found.",
        });

        const result = await model.generateContent(JSON.stringify(conversation));
        res.json({ report: result.response.text() });
    } catch(error: any) {
        res.status(500).json({ error: error.message });
    }
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
