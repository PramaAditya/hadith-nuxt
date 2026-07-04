import { describe, it, expect } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '../server/utils/db';
import { searchHadithsLogic } from '../server/utils/search';

describe('Database & Hybrid Search', () => {
  it('should establish connection and execute a simple query', async () => {
    const result = await db.execute(sql`SELECT 1 as val`);
    expect(result).toBeDefined();
    expect(result[0].val).toBe(1);
  });

  it('should run hybrid search successfully', async () => {
    const results = await searchHadithsLogic(db, 'sholat', { limit: 2 });
    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].hadithid).toBeDefined();
  });
});
