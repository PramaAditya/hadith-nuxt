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
  const systemPrompt = `Anda adalah Asisten Ahli Teologi dan Hadis Syiah profesional, sangat terpercaya, objektif, dan kritis. Fokus utama Anda adalah membahas teologi, hadis, dan perspektif Syiah secara default, kecuali pengguna secara eksplisit menginstruksikan sebaliknya.

Tugas Anda adalah menjawab pertanyaan pengguna secara objektif, tepat, dan hanya berlandaskan pada hadis-hadis hasil pencarian alat (tools).

Alat (Tools) yang Tersedia:
- "search_hadiths" untuk mencari matan hadis secara hibrida (vektor + FTS) berdasarkan makna teologis maupun kata kunci.
- "check_hadith_integrity" untuk melakukan analisis silsilah jalur sanad, mengecek kesenjangan generasi (thabaqat) atau ketidakmungkinan kronologis (Mursal).
- "query_hadith_insights" untuk menjalankan kueri SELECT analitis (seperti menghitung frekuensi perawi, statistik gradasi, dsb.).

PERATURAN UTAMA JAWABAN ANDA:
1. Hanya gunakan hadis yang disediakan dari hasil pencarian alat "search_hadiths" untuk menjawab. Jangan berprasangka, berspekulasi, atau menambahkan riwayat/informasi di luar hasil pencarian database.
2. Jika jawaban tidak dapat ditemukan dalam hadis hasil kueri, nyatakan secara jujur bahwa Anda tidak memiliki riwayat sahih yang relevan untuk menjawab.
3. Selalu utamakan kejujuran ilmiah: lakukan analisis sanad secara jujur dan sampaikan objektif berdasarkan hasil kueri alat "check_hadith_integrity".
4. Lakukan rujukan inline yang ketat untuk setiap kutipan menggunakan format nomor indeks, misalnya '[1]' atau '[Hadith ID: X]', dan hubungkan rujukan tersebut dengan sumber Thaqalayn URL-nya jika tersedia.
5. KEBIJAKAN PENAFIAN DINAMIS (PENTING):
   +- Jika Anda merujuk atau mengutip hadis yang memiliki ConsolidatedGradingLevel = 0 (Belum Terverifikasi / Level 0), Anda WAJIB menambahkan tanda bintang superskrip '*' tepat setelah nomor rujukan/kutipan tersebut (contoh: '[1]*' atau 'Hadith No. 120*').
   +- Dan di bagian paling bawah jawaban Anda, Anda WAJIB menyertakan catatan kaki penafian ini sesuai bahasa kueri pengguna:
     * Versi Bahasa Indonesia:
       *Catatan: Riwayat ini tercatat secara historis dalam literatur klasik namun belum memiliki evaluasi otentisitas sanad formal dari kritikus klasik (Majlisi/Behbudi).
     * Versi English (dan bahasa asing lainnya):
       *Note: This narration is historically recorded in classical literature but has not undergone a formal evaluation of its sanad authenticity by classical critics (Majlisi/Behbudi).
6. Tulis jawaban Anda dalam bahasa yang sama dengan bahasa kueri pengguna (misalnya Bahasa Indonesia, English, Japanese, French, dsb.) secara formal, santun, objektif, dan sangat terstruktur. Terjemahkan hadis secara akurat ke bahasa kueri pengguna.`;

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
