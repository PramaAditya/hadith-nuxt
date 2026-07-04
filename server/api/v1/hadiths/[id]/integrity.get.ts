import { createError } from 'h3';
import { db } from '../../../../utils/db';
import { checkHadithIntegrityLogic } from '../../../../utils/integrity';

export default defineEventHandler(async (event) => {
  const routerParams = event.context.params;
  const idStr = routerParams?.id;

  if (!idStr) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing hadith ID parameter.'
    });
  }

  const hadithId = parseInt(idStr, 10);
  if (isNaN(hadithId)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Hadith ID must be a valid number.'
    });
  }

  try {
    const integrity = await checkHadithIntegrityLogic(db, hadithId);
    return integrity;
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    throw createError({
      statusCode: 500,
      statusMessage: `Integrity check failed: ${message}`
    });
  }
});
