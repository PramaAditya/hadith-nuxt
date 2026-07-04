import { db } from '../../../utils/db';
import { searchHadithsLogic } from '../../../utils/search';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const q = query.q as string | undefined;

  if (!q) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing search query "q".'
    });
  }

  const book_ids = query.book_ids ? (query.book_ids as string).split(',') : undefined;
  const volume = query.volume ? parseInt(query.volume as string, 10) : undefined;
  const grading_level = query.grading_level ? parseInt(query.grading_level as string, 10) : undefined;
  const limit = query.limit ? parseInt(query.limit as string, 10) : 10;

  try {
    const results = await searchHadithsLogic(db, q, {
      book_ids,
      volume,
      grading_level,
      limit
    });

    return {
      status: 'success',
      total: results.length,
      results
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw createError({
      statusCode: 500,
      statusMessage: `Search error: ${message}`
    });
  }
});
