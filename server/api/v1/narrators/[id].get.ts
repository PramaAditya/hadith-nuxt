import { eq } from 'drizzle-orm';
import { createError } from 'h3';
import { db } from '../../../utils/db';
import { Narrators } from '../../../database/schema';

export default defineEventHandler(async (event) => {
  const routerParams = event.context.params;
  const idStr = routerParams?.id;

  if (!idStr) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing narrator ID parameter.'
    });
  }

  const narratorId = parseInt(idStr, 10);
  if (isNaN(narratorId)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Narrator ID must be a valid number.'
    });
  }

  try {
    const results = await db
      .select()
      .from(Narrators)
      .where(eq(Narrators.narratorid, narratorId))
      .limit(1);

    if (results.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: `Narrator with ID ${narratorId} not found.`
      });
    }

    return results[0];
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    throw createError({
      statusCode: 500,
      statusMessage: `Database error: ${message}`
    });
  }
});
