import { z } from 'zod';
import { db } from '../../utils/db';
import { queryHadithInsightsLogic } from '../../utils/insights';

export default defineMcpTool({
  name: 'query_hadith_insights',
  description: 'Execute analytical SELECT SQL queries against the hadith database. Strictly read-only.',
  inputSchema: {
    sqlQuery: z.string().describe('Analytical SELECT SQL query. Avoid mutating commands (INSERT, UPDATE, DELETE, etc.) and ILIKE.')
  },
  async handler(args: { sqlQuery: string }) {
    try {
      const { sqlQuery } = args;
      const result = await queryHadithInsightsLogic(db, sqlQuery);
      return jsonResult(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(message);
    }
  }
});
