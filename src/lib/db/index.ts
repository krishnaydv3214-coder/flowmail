import { Pool, QueryResult } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('DATABASE_URL is not set. Database operations will fail.');
}

const pool = new Pool({
  connectionString,
  ssl: connectionString?.includes('sslmode=require') || connectionString?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : undefined,
});

export const db = {
  async query<T extends Record<string, any> = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const res = await pool.query<T>(text, params);
      const duration = Date.now() - start;
      // console.log('executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error('Database query error:', error, { text });
      throw error;
    }
  },

  async getClient() {
    return await pool.connect();
  },

  // Helper to upsert a user (Clerk sync)
  async syncUser(id: string, email: string, name?: string) {
    const queryText = `
      INSERT INTO users (id, email, name, corsair_connected)
      VALUES ($1, $2, $3, FALSE)
      ON CONFLICT (id) DO UPDATE
      SET email = EXCLUDED.email, name = COALESCE(EXCLUDED.name, users.name)
      RETURNING *;
    `;
    const res = await this.query(queryText, [id, email, name || null]);
    return res.rows[0];
  }
};
