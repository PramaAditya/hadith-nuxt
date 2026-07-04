import { z } from 'zod';
import { db } from '../../utils/db';
import { checkHadithIntegrityLogic } from '../../utils/integrity';

export default defineMcpTool({
  name: 'check_hadith_integrity',
  description: 'Check the transmission chain (silsilah sanad) integrity and gaps for a given hadith ID.',
  inputSchema: {
    hadithId: z.number().describe('The database Hadith ID (hadithid) to analyze.')
  },
  async handler(args: { hadithId: number }) {
    try {
      const { hadithId } = args;
      const result = await checkHadithIntegrityLogic(db, hadithId);
      return jsonResult(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResult(message);
    }
  }
});
