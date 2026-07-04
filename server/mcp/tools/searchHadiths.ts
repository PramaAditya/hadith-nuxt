import { z } from 'zod';
import { db } from '../../utils/db';
import { searchHadithsLogic } from '../../utils/search';

export default defineMcpTool({
  name: 'search_hadiths',
  description: 'Search for Shia hadiths using bilingual hybrid search (vector + keyword search).',
  inputSchema: {
    q: z.string().describe('Search query in Indonesian or English.'),
    limit: z.number().optional().describe('Maximum number of hadiths to return (default 10).')
  },
  async handler(args: { q: string; limit?: number }) {
    try {
      const { q, limit } = args;
      const results = await searchHadithsLogic(db, q, { limit });
      return jsonResult(results);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(message);
    }
  }
});
