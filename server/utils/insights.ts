import { sql } from 'drizzle-orm';
import type { Database } from './db';

export interface InsightsQueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  total: number;
}

export async function queryHadithInsightsLogic(
  db: Database,
  query: string
): Promise<InsightsQueryResult> {
  const sanitized = query.trim();
  const upper = sanitized.toUpperCase();

  // 1. Strictly enforce read-only SELECT queries
  if (!upper.startsWith('SELECT') && !upper.startsWith('WITH')) {
    throw new Error('Query must be a read-only SELECT or WITH statement.');
  }

  // 2. Scrub forbidden keywords to prevent mutations
  const forbiddenKeywords = [
    'INSERT',
    'UPDATE',
    'DELETE',
    'DROP',
    'CREATE',
    'ALTER',
    'TRUNCATE',
    'REPLACE',
    'GRANT',
    'REVOKE',
    'COPY',
    'VACUUM',
    'ANALYZE'
  ];

  for (const kw of forbiddenKeywords) {
    // Check with word boundaries to avoid false positives (e.g., "created_at")
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    if (regex.test(sanitized)) {
      throw new Error(`Forbidden keyword detected: "${kw}". Only read-only SELECT queries are allowed.`);
    }
  }

  // 3. Ban slow ILIKE operator in favor of fast pg_trgm % similarity or FTS
  if (upper.includes('ILIKE')) {
    throw new Error(
      'Slow "ILIKE" operator is banned. Please use pg_trgm similarity operator (%) or full-text search @@ for high performance.'
    );
  }

  // 4. Execute the query
  try {
    const rawResult = await db.execute(sql.raw(sanitized));
    const rows = rawResult as unknown as Record<string, unknown>[];

    const columns = rows.length > 0 && rows[0] ? Object.keys(rows[0]) : [];

    return {
      columns,
      rows,
      total: rows.length
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Database query execution failed: ${message}`);
  }
}
