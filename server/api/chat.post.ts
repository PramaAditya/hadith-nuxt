import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, isStepCount } from 'ai';
import { z } from 'zod';
import { db } from '../utils/db';
import { searchHadithsLogic } from '../utils/search';
import { checkHadithIntegrityLogic } from '../utils/integrity';
import { queryHadithInsightsLogic } from '../utils/insights';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const messages = body.messages;

  if (!messages || !Array.isArray(messages)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid messages array.'
    });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_API_KEY;
  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'GEMINI_API_KEY is not defined in the environment.'
    });
  }

  // 1. Initialize Gemini client
  const googleAI = createGoogleGenerativeAI({ apiKey });

  // 2. System Prompt
  const systemPrompt = `Anda adalah Asisten Ahli Teologi dan Hadis Syiah yang sangat terpelajar, objektif, dan kritis.
Tugas Anda adalah membantu pengguna memahami hadis-hadis Syiah dari literatur klasik (seperti Al-Kafi, Man La Yahduruhu al-Faqih, Tahdhib al-Ahkam, Al-Istibsar).

Gunakan alat (tools) yang disediakan secara aktif:
- "search_hadiths" untuk mencari matan hadis secara hibrida (vektor + FTS) berdasarkan makna teologis maupun kata kunci.
- "check_hadith_integrity" untuk melakukan analisis jalur sanad, mengecek kesenjangan generasi (thabaqat) atau ketidakmungkinan kronologis (Mursal).
- "query_hadith_insights" untuk menjalankan kueri SELECT analitis (seperti menghitung frekuensi perawi, statistik gradasi, dsb.).

Pedoman Jawaban Anda:
1. Selalu utamakan kejujuran ilmiah: jika sanad dinilai dha'if (lemah) atau memiliki celah (Mursal), sampaikan secara objektif berdasarkan hasil "check_hadith_integrity".
2. Berikan rujukan hadis yang lengkap (Nama Kitab, Volume, Halaman, Gradasi, dan link Thaqalayn jika ada).
3. Jawab dengan gaya akademis yang santun, seimbang, dan informatif dalam Bahasa Indonesia yang formal dan alami (hindari bahasa artifisial atau robotik).`;

  try {
    // 3. Run streamText with dynamic tool calling
    const result = streamText({
      model: googleAI('gemini-3.5-flash'), // Stable high-performance model
      system: systemPrompt,
      messages,
      stopWhen: isStepCount(5), // Enable robust ReAct tool-calling loop using stopWhen
      tools: {
        search_hadiths: {
          description: 'Mencari hadis Syiah menggunakan pencarian hibrida bilingual berdasarkan teks kueri.',
          inputSchema: z.object({
            q: z.string().describe('Kueri pencarian hadis dalam Bahasa Indonesia atau Inggris.'),
            limit: z.number().optional().describe('Jumlah maksimal hadis yang dikembalikan (default 5, maks 15).')
          }),
          execute: async ({ q, limit }) => {
            const results = await searchHadithsLogic(db, q, { limit: limit || 5 });
            return results;
          }
        },
        check_hadith_integrity: {
          description: 'Memeriksa integritas silsilah periwayatan (sanad) dan celah kronologis untuk ID hadis tertentu.',
          inputSchema: z.object({
            hadithId: z.number().describe('ID hadis (hadithid) yang ingin diperiksa sanadnya.')
          }),
          execute: async ({ hadithId }) => {
            const result = await checkHadithIntegrityLogic(db, hadithId);
            return result;
          }
        },
        query_hadith_insights: {
          description: 'Menjalankan kueri SELECT SQL aman dan read-only untuk kebutuhan analisis statistik database.',
          inputSchema: z.object({
            sqlQuery: z.string().describe('Kueri SQL SELECT aman. Dilarang keras menggunakan INSERT/UPDATE/DELETE/ALTER/DROP.')
          }),
          execute: async ({ sqlQuery }) => {
            const result = await queryHadithInsightsLogic(db, sqlQuery);
            return result;
          }
        }
      }
    });

    // 4. Return standard UI Message Stream response for Nuxt 4 compatibility
    return result.toUIMessageStreamResponse();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw createError({
      statusCode: 500,
      statusMessage: `Chat error: ${message}`
    });
  }
});
