import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, isStepCount, convertToModelMessages } from 'ai';
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
+ "search_hadiths" untuk mencari hadis secara hibrida (vektor + FTS) berdasarkan makna teologis maupun kata kunci.
+ "check_hadith_integrity" untuk melakukan analisis silsilah jalur sanad, mengecek kesenjangan generasi (thabaqat) atau ketidakmungkinan kronologis (Mursal).
+ "query_hadith_insights" untuk menjalankan kueri SELECT analitis (seperti menghitung frekuensi perawi, statistik gradasi, dsb.).

PANDUAN PEMANGGILAN ALAT (PENTING - EFEKTIF & CEPAT):
 Anda harus menghemat panggilan alat demi mencegah waktu respon yang lambat (response timeout).
 JANGAN memanggil "check_hadith_integrity" atau "query_hadith_insights" KECUALI jika pengguna secara eksplisit meminta analisis sanad/jalur transmisi perawi, pemeriksaan silsilah perawi, atau analisis statistik/kueri database SQL! Untuk pertanyaan teologi/akidah/penjelasan hadis biasa, Anda HANYA diperbolehkan menggunakan "search_hadiths".
 Selalu utamakan "search_hadiths" terlebih dahulu. Karena "search_hadiths" sudah mengembalikan teks matan lengkap (Arab/matnar, Inggris/matnen, Indonesia/matnid) serta metadata detail (kitab, volume, URL), Anda DILARANG melakukan kueri SELECT SQL tambahan ("query_hadith_insights") hanya untuk mengambil teks hadis yang sudah Anda temukan dari "search_hadiths".
 JANGAN memanggil "search_hadiths" lebih dari 1 atau 2 kali dalam satu putaran. Gabungkan seluruh kata kunci pencarian Anda ke dalam 1 kueri yang matang, spesifik, dan komprehensif, alih-alih membuat banyak kueri pencarian paralel terpisah dengan variasi kata kunci kecil. Hal ini untuk mencegah pemanggilan embedding beruntun yang memicu response timeout atau rate limit.
 JANGAN memanggil banyak alat secara paralel secara berlebihan. Batasi jumlah total pemanggilan alat (tools) dalam satu putaran maksimal 2 panggilan saja!
 Anda WAJIB membatasi analisis Anda hanya pada 1 atau 2 hadis paling utama yang paling relevan dengan kueri pengguna (misalnya Hadis No. 13 tentang wasiat kepada Hisham). JANGAN mencari, mengueri, atau menganalisis belasan hadis sekunder yang membuat proses pemanggilan alat menjadi sangat lambat dan menyebabkan kegagalan sistem (response timeout).
 SANGAT PENTING: Jika pengguna menanyakan tentang Imam atau tokoh tertentu (contoh: Imam al-Kazhim), fokuslah HANYA pada hadis yang dinarasikan dari Imam tersebut. DILARANG keras mengueri atau mencari hadis tentang topik umum dari Imam lain (seperti Imam al-Sadiq atau Imam al-Rida) kecuali pengguna memintanya secara eksplisit. Ini untuk mencegah ledakan panggilan database dan overhead kueri yang tidak perlu.
 Lakukan panggilan alat secara paralel dalam SATU putaran (single turn) jika memungkinkan.
 Batasi seluruh alur kerja Anda agar selesai dalam maksimal 1 atau 2 putaran panggilan alat saja. Segera selesaikan jawaban teks Anda begitu informasi hadis dasar telah didapatkan.
 DILARANG keras melakukan pemanggilan alat (tool calls) secara beruntun (sequential) di putaran kedua. Semua pencarian data hadis harus diselesaikan sepenuhnya pada putaran pertama (Step 1). Pada putaran kedua (Step 2), Anda WAJIB langsung menghasilkan teks jawaban akhir untuk pengguna berdasarkan data yang diperoleh dari putaran pertama. Jangan memanggil alat apa pun lagi di putaran kedua!

 PENTING (TENTANG HADIS RINGKAS DI DATABASE):
 - Beberapa hadis panjang di database (terutama Hadis No. 13 Al-Kafi tentang Wasiat Hisham) disimpan dalam bentuk ringkasan pendek di tabel (ditandai dengan tanda kurung "(hadis panjang tentang...)").
 - Anda DILARANG keras mencoba mencari atau mengueri kueri SQL berkali-kali untuk menemukan versi lengkap/non-ringkas dari hadis tersebut di database, karena versi lengkapnya memang tidak disimpan di tabel ini.
 - Gunakan ringkasan matan yang ada di database apa adanya, lalu gunakan pengetahuan teologis internal Anda untuk mengelaborasi teks asli lengkapnya (seperti konsep "dua hujah: lahiriah (para nabi/rasul) dan batiniah (akal)" dari Imam al-Kazhim) secara akurat demi menjawab pertanyaan pengguna tanpa perlu melakukan kueri tambahan!
PERATURAN UTAMA JAWABAN ANDA:
1. Hanya gunakan hadis yang disediakan dari hasil pencarian alat ("search_hadiths" atau kueri "query_hadith_insights") untuk menjawab. Jangan berprasangka, berspekulasi, atau menambahkan riwayat/informasi di luar hasil pencarian database. Begitu hadis yang dicari sudah ditemukan, segera selesaikan panggilan alat dan berikan jawaban akhir Anda kepada pengguna tanpa melakukan pemanggilan alat tambahan yang tidak perlu.
2. Jika jawaban tidak dapat ditemukan dalam hadis hasil kueri, nyatakan secara jujur bahwa Anda tidak memiliki riwayat sahih yang relevan untuk menjawab.
3. Selalu utamakan kejujuran ilmiah: JIKA pengguna secara eksplisit meminta pemeriksaan silsilah perawi atau analisis sanad, lakukan analisis sanad secara jujur dan sampaikan objektif berdasarkan hasil kueri alat "check_hadith_integrity". Jika tidak diminta, Anda tidak perlu memanggil alat tersebut dan cukup jelaskan isi hadis secara objektif berdasarkan matan.
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
      messages: await convertToModelMessages(messages),
      stopWhen: isStepCount(5), // Enable robust ReAct tool-calling loop using stopWhen
      tools: {
        search_hadiths: {
          description: 'Mencari hadis Syiah menggunakan pencarian hibrida bilingual berdasarkan kueri teks. Kembalian alat ini sangat lengkap, mencakup teks matan Arab (matnar), Inggris (matnen), Indonesia (matnid), nomor jilid, grading, URL, dan nomor hadis kitab. JANGAN melakukan kueri SELECT SQL manual di "query_hadith_insights" hanya untuk mengambil teks hadis yang sudah ditemukan dari alat ini.',
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
          description: 'Menjalankan kueri SELECT SQL aman dan read-only untuk kebutuhan analisis statistik database. Hubungkan tabel jika diperlukan. Schema: hadiths (hadithid, hadithidinbook, volume, bookid, category, chapter, consolidatedgradinglevel, matnar, matnen, matnid, arabicsanad, englishsanad, primaryspeaker, url, arabictext), books (bookid, bookname, author, volume), narrators (narratorid, standardnameen, standardnamear, thabaqat, reliability), hadithnarrators (hadithid, narratorid, narratorposition)',
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
    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      onError: (err) => {
        console.error('Stream error during execution:', err);
        return err instanceof Error ? err.message : String(err);
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw createError({
      statusCode: 500,
      statusMessage: `Chat error: ${message}`
    });
  }
});
