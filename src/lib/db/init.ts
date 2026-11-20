import { db } from './index';
import * as fs from 'fs';
import * as path from 'path';

export async function initDatabase() {
  console.log('Initializing database schema...');
  try {
    const schemaPath = path.join(process.cwd(), 'src/lib/db/schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    // Run the schema queries
    await db.query(sql);
    console.log('Database schema initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
    throw error;
  }
}
