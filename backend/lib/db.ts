import pg from "pg";
import dns from "dns";

// Fix for Node.js DNS resolving Supabase IPv6 hosts
dns.setDefaultResultOrder("ipv6first");

let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!pool) {
    const connStr = process.env.SUPABASE_DB_URL;
    if (!connStr) throw new Error("SUPABASE_DB_URL not set in .env");

    pool = new pg.Pool({
      connectionString: connStr,
      ssl: {
        rejectUnauthorized: false
      },
      max: 10,
    });
  }
  return pool;
}

export async function query(text: string, params?: any[]) {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

export async function getClient() {
  return getPool().connect();
}

export async function initDB() {
  // Enable pgvector extension
  await query(`CREATE EXTENSION IF NOT EXISTS vector`);

  // Create embeddings table if not exists
  await query(`
    CREATE TABLE IF NOT EXISTS dataset_embeddings (
      id SERIAL PRIMARY KEY,
      chunk_text TEXT NOT NULL,
      row_indices INTEGER[] NOT NULL,
      embedding vector(768),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Create dataset metadata table
  await query(`
    CREATE TABLE IF NOT EXISTS dataset_metadata (
      id SERIAL PRIMARY KEY,
      table_name TEXT NOT NULL,
      file_name TEXT NOT NULL,
      row_count INTEGER NOT NULL,
      columns JSONB NOT NULL,
      summary_text TEXT,
      warnings TEXT[],
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  console.log("Database initialized with pgvector.");
}

export default getPool;
