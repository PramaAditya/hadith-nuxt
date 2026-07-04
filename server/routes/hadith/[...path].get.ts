import { eq, like, sql } from 'drizzle-orm';
import { createError } from 'h3';
import { db } from '../../utils/db';
import { Hadiths, Books } from '../../database/schema';

export default defineEventHandler(async (event) => {
  const routerParams = event.context.params;
  const pathStr = routerParams?.path;

  if (!pathStr) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing hadith path.'
    });
  }

  // pathStr is either "1/1/0/1" or similar, or segments. Let's sanitize it.
  // Sometimes Nuxt splits [...path] into a string separated by slashes or parses it.
  const pathQuery = pathStr.replace(/\/$/, ''); // Remove trailing slash if any

  try {
    // We match the end of the URL or the full URL.
    // Thaqalayn URLs look like "https://thaqalayn.net/hadith/1/0/1/1"
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
      .where(sql`${Hadiths.url} LIKE ${'%/hadith/' + pathQuery}`)
      .limit(1);

    if (results.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: `Hadith with path "/hadith/${pathQuery}" not found.`
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
      statusMessage: `Database lookup failed: ${message}`
    });
  }
});
