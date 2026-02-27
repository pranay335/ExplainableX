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
  // Create full-text search chunks table (no pgvector needed!)
  await query(`
    CREATE TABLE IF NOT EXISTS dataset_chunks (
      id SERIAL PRIMARY KEY,
      chunk_text TEXT NOT NULL,
      row_indices INTEGER[] NOT NULL,
      search_vector tsvector,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Create GIN index for fast full-text search
  await query(`
    CREATE INDEX IF NOT EXISTS idx_chunks_search 
    ON dataset_chunks USING GIN (search_vector)
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

  console.log("Database initialized (full-text search, zero embedding tokens).");
}

export default getPool;
