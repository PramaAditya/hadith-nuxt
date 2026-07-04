import { eq } from 'drizzle-orm';
import { createError } from 'h3';
import { db } from '../../../utils/db';
import { Hadiths, Books } from '../../../database/schema';

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
    const results = await db
      .select({
        hadithid: Hadiths.hadithid,
        bookid: Hadiths.bookid,
        hadithidinbook: Hadiths.hadithidinbook,
        volume: Hadiths.volume,
        category: Hadiths.category,
        chapter: Hadiths.chapter,
        arabictext: Hadiths.arabictext,
        englishtext: Hadiths.englishtext,
        arabicsanad: Hadiths.arabicsanad,
        matnar: Hadiths.matnar,
        englishsanad: Hadiths.englishsanad,
        matnen: Hadiths.matnen,
        matnid: Hadiths.matnid,
        primaryspeaker: Hadiths.primaryspeaker,
        semantictagsid: Hadiths.semantictagsid,
        semantictagsen: Hadiths.semantictagsen,
        onelinersummaryid: Hadiths.onelinersummaryid,
        onelinersummaryen: Hadiths.onelinersummaryen,
        scholarlyconsensusid: Hadiths.scholarlyconsensusid,
        scholarlyconsensusen: Hadiths.scholarlyconsensusen,
        consolidatedgradinglevel: Hadiths.consolidatedgradinglevel,
        scholargradings: Hadiths.scholargradings,
        gradingsfull: Hadiths.gradingsfull,
        url: Hadiths.url,
        bookname: Books.bookname,
        bookenglishname: Books.englishname
      })
      .from(Hadiths)
      .innerJoin(Books, eq(Hadiths.bookid, Books.bookid))
      .where(eq(Hadiths.hadithid, hadithId))
      .limit(1);

    if (results.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: `Hadith with ID ${hadithId} not found.`
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
