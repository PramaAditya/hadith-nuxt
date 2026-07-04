import { sql } from 'drizzle-orm';
import type { Database } from './db';

export interface SearchHadithResult {
  hadithid: number;
  bookid: string;
  hadithidinbook: number;
  volume: number;
  category: string;
  chapter: string;
  arabicsanad: string[] | null;
  arabicmatn: string | null;
  englishsanad: string | null;
  englishmatn: string | null;
  indonesianmatn: string | null;
  url: string | null;
  vectorrank: number;
  ftsrank: number;
  rrfscore: number;
  consolidatedgradinglevel: number | null;
  scholargradings: unknown;
  bookname: string;
  bookenglishname: string | null;
}

export async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY or GOOGLE_GENERATIVE_API_KEY is not defined.');
  }

  const formattedText = `task: search result | query: ${text}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        content: {
          parts: [{ text: formattedText }]
        },
        output_dimensionality: 768
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini embedding API error: ${response.status} ${errorText}`);
  }

  const data = await response.json() as { embedding: { values: number[] } };
  if (!data.embedding || !data.embedding.values) {
    throw new Error('Invalid response structure from Gemini Embedding API');
  }
  return data.embedding.values;
}

export async function searchHadithsLogic(
  db: Database,
  q: string,
  options: {
    limit?: number;
    book_ids?: string[];
    volume?: number;
    grading_level?: number;
  } = {}
): Promise<SearchHadithResult[]> {
  const limit = options.limit || 10;

  // 1. Generate query embedding using gemini-embedding-2
  let queryVector: number[] = new Array(768).fill(0);
  try {
    queryVector = await getEmbedding(q);
  } catch (err) {
    console.error('Embedding generation failed, using fallback vector:', err);
  }

  // 2. Query pre-existing hybrid_search_hadiths function
  const results = await db.execute(sql`
    SELECT 
      s.hadithid,
      s.bookid,
      s.hadithidinbook,
      s.volume,
      s.category,
      s.chapter,
      s.arabicsanad,
      s.arabicmatn,
      s.englishsanad,
      s.englishmatn,
      s.indonesianmatn,
      s.url,
      s.vectorrank,
      s.ftsrank,
      s.rrfscore,
      h.consolidatedgradinglevel,
      h.scholargradings,
      b.bookname,
      b.englishname as bookenglishname
    FROM hybrid_search_hadiths(${q}, ${JSON.stringify(queryVector)}::vector, ${limit * 3}) s
    JOIN hadiths h ON s.hadithid = h.hadithid
    JOIN books b ON s.bookid = b.bookid
  `);

  let rows = results as unknown as SearchHadithResult[];

  // 3. Apply post-query filters in TS for precision
  if (options.book_ids && options.book_ids.length > 0) {
    rows = rows.filter(r => options.book_ids!.includes(r.bookid));
  }
  if (options.volume !== undefined) {
    rows = rows.filter(r => r.volume === options.volume);
  }
  if (options.grading_level !== undefined) {
    rows = rows.filter(r => r.consolidatedgradinglevel === options.grading_level);
  }

  return rows.slice(0, limit);
}
