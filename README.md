<div align="center">
<img width="1200" height="475" alt="ExplainableX Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# ExplainableX: AI-Powered Data Analysis & Visualization

ExplainableX is a premium RAG-powered (Retrieval-Augmented Generation) data analysis platform that converts natural language questions into interactive, high-fidelity visualizations and summarized insights. Built with a focus on "Zero Hallucination" analysis and a professional, glassmorphism-inspired aesthetic.

## 🚀 Features

- **Natural Language to SQL**: Interrogate your datasets (CSV/JSON) using plain English.
- **Premium Visualizations**: Dynamic, interactive charts (Bar, Line, Area, Pie) with linear gradients and SVG shadows.
- **Glassmorphism UI**: A modern, sleek interface with backdrop-blurs and refined typography.
- **Data Safety**: No embeddings! Results are strictly grounded in your provided dataset using a structured RAG pipeline.
- **Tabbed Results**: View findings through an Executive Summary, a raw Data Table, or a high-end Visualization.
- **Query Transparency**: Inspect the exact SQL query generated for complete explainability.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Recharts, Framer Motion, Tailwind CSS 4, Lucide React.
- **Backend**: Node.js, Express, Multer, PG (PostgreSQL).
- **Database**: PostgreSQL (Supabase ready).
- **AI**: OpenAI (GPT-4o-mini) or Hugging Face (Llama-3-8B).

---

## ⚙️ Quick Start

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL Database

### 2. Installation
Install all dependencies for root, frontend, and backend:
```bash
npm run install:all
```

### 3. Environment Setup
Copy the example environment file and fill in your keys:
```bash
cp .env.example .env
```
Key requirements:
- `SUPABASE_DB_URL`: Your PostgreSQL connection string.
- `OPENAI_API_KEY`: Your OpenAI key.
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins (e.g., your Vercel URL).
- `VITE_API_BASE_URL`: The URL of your backend API (used for production).

### 4. Development
Run both frontend and backend concurrently:
```bash
npm run dev
```
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`

---

## 🏗️ Architecture

1.  **Ingestion**: User uploads CSV/JSON → In-memory cleaning → PG Table creation.
2.  **API Layer**: Centralized API utility in the frontend handles environment-specific base URLs, enabling seamless switching between local and production environments.
3.  **RAG Loop**: 
    - AI converts question + schema into optimized SQL.
    - Resulting data is retrieved from PG.
    - AI summarizes the data and configures the visualization.
4.  **Rendering**: Frontend dynamically generates premium charts based on AI-determined dimensions and types.

---

## 🌍 Deployment

### Frontend (Vercel)
The frontend is optimized for Vercel:
1.  Set `VITE_API_BASE_URL` in Vercel settings to your Render backend URL.
2.  Deploy using the standard Vite settings.
3.  Build command: `npm run build:frontend`.

### Backend (Render)
The backend is optimized for Render:
1.  Set `ALLOWED_ORIGINS` to your Vercel frontend URL.
2.  Set `PORT` to handle the dynamic port assignment.
3.  Build and start command handled via `backend/package.json` scripts.

### Build All
To verify the entire project for production:
```bash
npm run build:all
```

---

## 🐳 Docker
The project includes a `.dockerignore` for clean containerization. 
