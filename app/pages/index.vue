<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';

// Types for search results and data
interface SearchHadithResult {
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
  scholargradings: any;
  bookname: string;
  bookenglishname: string | null;
  scholarlyconsensusid: string | null;
  scholarlyconsensusen: string | null;
}

interface Narrator {
  narratorid: number;
  standardnamear: string;
  standardnameen: string | null;
  kunya: string | null;
  reliability: string | null;
  thabaqat: number | null;
  birthhijri: number | null;
  deathhijri: number | null;
  biographicalsummaryid: string | null;
  biographicalsummaryen: string | null;
  nisbah: string | null;
  haswrittenbooks: boolean;
  aliases: string[] | null;
  schoolorsect: string;
}

interface SilsilahNode {
  narratorid: number;
  standardnamear: string;
  standardnameen: string | null;
  thabaqat: number | null;
  birthhijri: number | null;
  deathhijri: number | null;
  reliability: string | null;
  narratorposition: number;
}

interface IntegrityResult {
  hadithid: number;
  is_continuous: boolean;
  gaps: Array<{
    type: string;
    description: string;
    student: string;
    student_id: number;
    teacher: string;
    teacher_id: number;
  }>;
  analysis: string;
  chain: SilsilahNode[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{
    hadithid: number;
    bookname: string;
    volume: number;
    hadithidinbook: number;
    indonesian_matn?: string;
    english_matn?: string;
    arabic_matn?: string;
    grading?: number;
    url?: string;
  }>;
  statusText?: string;
}

// ----------------------------------------------------
// UI Language & Content Swapper (ID / EN)
// ----------------------------------------------------
const lang = ref<'ID' | 'EN'>('ID');

const t = computed(() => {
  if (lang.value === 'ID') {
    return {
      title: 'Khazanah Hadis Syiah RAG & Platform',
      searchPlaceholder: 'Cari hadis teologis, ketik di sini (misal: "Kemuliaan Akal")...',
      suggestedLabel: 'Saran Kueri:',
      suggestedPills: ['Akal & Kebodohan', 'Tauhid', 'Aturan Sholat', 'Ahlul Bayt'],
      advancedFilters: 'Filter Lanjutan',
      bookFilter: 'Buku',
      volumeFilter: 'Volume',
      gradingFilter: 'Tingkat Keaslian',
      allBooks: 'Semua Buku',
      allVolumes: 'Semua Volume',
      authentic: 'Shahih (Sangat Kuat)',
      good: 'Hasan (Baik)',
      weak: 'Dhaif (Lemah)',
      unverified: 'Muraffaa / Belum Diverifikasi',
      searchBtn: 'Cari',
      chatTab: 'Asisten Teologi AI',
      searchTab: 'Pencarian Hibrida Vektor',
      emptyResults: 'Tidak ada hadis yang ditemukan. Silakan masukkan kata kunci pencarian baru.',
      loadingSearch: 'Mencari database hadis...',
      hadithTitle: 'Hadis',
      gradingLabel: 'Gradasi:',
      narratorLabel: 'Transmisi Sanad:',
      viewBio: 'Lihat Rijal',
      unverifiedDisclaimer: 'Narasi ini tercatat secara historis dalam literatur klasik namun belum melalui evaluasi sanad formal oleh kritikus klasik (Majlisi/Behbudi).',
      copyCitation: 'Salin Kutipan Chicago',
      copiedSuccess: 'Kutipan berhasil disalin!',
      chatPlaceholder: 'Tanyakan sesuatu tentang hadis Syiah...',
      chatIntro: 'Selamat datang di Asisten Grounded AI Teologi Syiah. Tanyakan pertanyaan mengenai teologi, akidah, atau hukum, dan asisten akan mencarikan hadis orisinal dari database serta memvalidasi kesahihan sanadnya.',
      sourceCitations: 'Rujukan Terkait:',
      integrityAnalysis: 'Analisis Integritas Sanad',
      integrityVerified: 'Sanad Bersambung (Muttashil)',
      integrityBroken: 'Sanad Terputus / Ada Celah',
      thabaqatLabel: 'Thabaqat:',
      lifespanLabel: 'Tahun Wafat:',
      reliabilityLabel: 'Keandalan:',
      loadingBio: 'Memuat data biografi perawi...',
      bioTitle: 'Biografi Rijal Perawi',
      schoolLabel: 'Afiliasi:'
    };
  }
  return {
    title: 'Shia Hadith Relational Knowledge & RAG Platform',
    searchPlaceholder: 'Search theological hadiths, type here (e.g., "Virtue of Intellect")...',
    suggestedLabel: 'Suggested:',
    suggestedPills: ['Virtue of Intellect', 'Tawhid', 'Rules of Prayer', 'Ahlul Bayt'],
    advancedFilters: 'Advanced Filters',
    bookFilter: 'Book',
    volumeFilter: 'Volume',
    gradingFilter: 'Authenticity Tier',
    allBooks: 'All Books',
    allVolumes: 'All Volumes',
    authentic: 'Sahih (Authentic)',
    good: 'Hasan (Good)',
    weak: 'Daif (Weak)',
    unverified: 'Unverified / Level 0',
    searchBtn: 'Search',
    chatTab: 'Theological AI Assistant',
    searchTab: 'Vector Hybrid Search',
    emptyResults: 'No hadiths found. Please try a different query.',
    loadingSearch: 'Searching hadith database...',
    hadithTitle: 'Hadith',
    gradingLabel: 'Grading:',
    narratorLabel: 'Chain of Transmission:',
    viewBio: 'View Biography',
    unverifiedDisclaimer: 'This narration is historically recorded in classical literature but has not undergone a formal evaluation of its sanad authenticity by classical critics (Majlisi/Behbudi).',
    copyCitation: 'Copy Chicago Citation',
    copiedSuccess: 'Citation copied successfully!',
    chatPlaceholder: 'Ask something about Shia hadiths...',
    chatIntro: 'Welcome to the Grounded Shia Theological AI Assistant. Ask questions about theology, doctrine, or laws, and the assistant will query the original database and validate the sanad authenticity.',
    sourceCitations: 'Related Citations:',
    integrityAnalysis: 'Sanad Integrity Analysis',
    integrityVerified: 'Continuous Chain (Muttashil)',
    integrityBroken: 'Broken Chain / Gaps Detected',
    thabaqatLabel: 'Thabaqat:',
    lifespanLabel: 'Year of Death:',
    reliabilityLabel: 'Reliability:',
    loadingBio: 'Loading narrator biography...',
    bioTitle: 'Rijal Biography',
    schoolLabel: 'Affiliation:'
  };
});

// ----------------------------------------------------
// UI States & Variables
// ----------------------------------------------------
const activeTab = ref<'search' | 'chat'>('search');
const searchQuery = ref('');
const results = ref<SearchHadithResult[]>([]);
const searchLoading = ref(false);

// Advanced Filter States
const isFiltersOpen = ref(false);
const filterBook = ref('');
const filterVolume = ref<number | null>(null);
const filterGrading = ref<number[]>([]);

// Pre-fetched lists (mocked or populated)
const booksList = ref<Array<{ id: string; name: string }>>([
  { id: 'Al-Kafi-Volume-1-Kulayni', name: 'Al-Kafi - Vol 1' },
  { id: 'Al-Kafi-Volume-2-Kulayni', name: 'Al-Kafi - Vol 2' },
  { id: 'Man-La-Yahduruh-al-Faqih-Volume-1-Saduq', name: 'Man La Yahduruh al-Faqih - Vol 1' }
]);

// Selected Narrator Drawer
const isBioOpen = ref(false);
const bioLoading = ref(false);
const activeNarrator = ref<Narrator | null>(null);

// Selected Hadith Integrity Modal
const isIntegrityModalOpen = ref(false);
const integrityLoading = ref(false);
const activeIntegrityResult = ref<IntegrityResult | null>(null);

// Selected Hadith Citation Detail Modal
const isHadithModalOpen = ref(false);
const activeHadithModal = ref<any>(null);

// ----------------------------------------------------
// AI Assistant Chat States
// ----------------------------------------------------
const chatInput = ref('');
const chatMessages = ref<ChatMessage[]>([]);
const chatLoading = ref(false);
const streamStatusText = ref('');

// ----------------------------------------------------
// API Calls & Actions
// ----------------------------------------------------

// Execute Hadith Search
const handleSearch = async (queryText?: string) => {
  const q = queryText || searchQuery.value;
  if (!q.trim()) return;
  
  if (queryText) {
    searchQuery.value = queryText;
  }

  searchLoading.value = true;
  try {
    // Build query params
    const params: Record<string, string> = { q };
    if (filterBook.value) params.book_ids = filterBook.value;
    if (filterVolume.value) params.volume = String(filterVolume.value);
    if (filterGrading.value.length > 0) params.grading_level = filterGrading.value.join(',');

    const queryStr = new URLSearchParams(params).toString();
    const res = await $fetch(`/api/v1/hadiths/search?${queryStr}`) as { results: SearchHadithResult[] };
    results.value = res.results;
  } catch (err) {
    console.error('Search failed:', err);
  } finally {
    searchLoading.value = false;
  }
};

// View Narrator Biography
const viewNarratorBiography = async (narratorId: number) => {
  isBioOpen.value = true;
  bioLoading.value = true;
  activeNarrator.value = null;
  try {
    const res = await $fetch(`/api/v1/narrators/${narratorId}`) as Narrator;
    activeNarrator.value = res;
  } catch (err) {
    console.error('Failed to load narrator:', err);
  } finally {
    bioLoading.value = false;
  }
};

// Check Hadith Integrity
const viewHadithIntegrity = async (hadithId: number) => {
  isIntegrityModalOpen.value = true;
  integrityLoading.value = true;
  activeIntegrityResult.value = null;
  try {
    const res = await $fetch(`/api/v1/hadiths/${hadithId}/integrity`) as IntegrityResult;
    activeIntegrityResult.value = res;
  } catch (err) {
    console.error('Failed to run integrity check:', err);
  } finally {
    integrityLoading.value = false;
  }
};

// Copy Citation chicago-style
const handleCopyCitation = (h: SearchHadithResult) => {
  const book = h.bookenglishname || h.bookname;
  const vol = h.volume;
  const page = h.hadithidinbook;
  const text = h.englishmatn || h.indonesianmatn || '';
  const url = h.url || 'https://thaqalayn.net';
  
  // Format Chicago Style
  const citation = `"${text.substring(0, 150)}..." Di dalam ${book}, Vol. ${vol}, Hal. ${page}. Gradasi: ${getGradingName(h.consolidatedgradinglevel)}. Sumber: ${url}`;
  
  navigator.clipboard.writeText(citation).then(() => {
    // Show toast or temporary message
    alert(t.value.copiedSuccess);
  });
};

// Helper to get Grading Text
const getGradingName = (lvl: number | null) => {
  if (lvl === 1) return t.value.authentic;
  if (lvl === 2) return t.value.good;
  if (lvl === 3) return t.value.weak;
  return t.value.unverified;
};

const getGradingColor = (lvl: number | null) => {
  if (lvl === 1) return 'success';
  if (lvl === 2) return 'primary';
  if (lvl === 3) return 'error';
  return 'warning';
};

// Hadith Citation Badge click
const openHadithDetail = (citation: any) => {
  activeHadithModal.value = citation;
  isHadithModalOpen.value = true;
};

// ----------------------------------------------------
// Chat Submission (Streaming response with custom data reader)
// ----------------------------------------------------
const handleSendChatMessage = async () => {
  const text = chatInput.value.trim();
  if (!text || chatLoading.value) return;

  chatInput.value = '';
  chatLoading.value = true;
  streamStatusText.value = 'Menghubungkan asisten...';

  // Add user message to UI
  chatMessages.value.push({
    id: String(Date.now()),
    role: 'user',
    content: text
  });

  // Prepare placeholder assistant message
  const assistantMsgId = String(Date.now() + 1);
  const assistantMsg: ChatMessage = {
    id: assistantMsgId,
    role: 'assistant',
    content: '',
    citations: [],
    statusText: 'Berpikir...'
  };
  chatMessages.value.push(assistantMsg);

  const assistantMsgIndex = chatMessages.value.length - 1;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: chatMessages.value.slice(0, assistantMsgIndex).map(m => ({
          role: m.role,
          content: m.content
        }))
      })
    });

    if (!response.ok || !response.body) {
      throw new Error('Gagal terhubung dengan asisten.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;

    // We will parse the custom Vercel AI SDK Data Stream protocol
    let buffer = '';

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split('\n');
        // Save the last incomplete line back to buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          // Vercel AI SDK stream format: type:JSON_value
          // E.g., 0:"hello" or 2:[{"type":"citation",...}]
          const colonIndex = line.indexOf(':');
          if (colonIndex === -1) continue;

          const type = line.substring(0, colonIndex);
          const payloadStr = line.substring(colonIndex + 1);

          try {
            const payload = JSON.parse(payloadStr);

            if (type === '0') {
              // 0 represents text deltas
              assistantMsg.content += payload;
              assistantMsg.statusText = '';
            } else if (type === '2') {
              // 2 represents custom data stream (citations/insights/integrity)
              // payload is an array of custom items
              const dataList = Array.isArray(payload) ? payload : [payload];
              for (const item of dataList) {
                if (item.type === 'citation' && Array.isArray(item.hadiths)) {
                  assistantMsg.citations = [
                    ...(assistantMsg.citations || []),
                    ...item.hadiths
                  ];
                }
              }
            } else if (type === 'e') {
              // Tool execution status notification or dynamic ReAct updates
              if (payload && payload.toolName) {
                if (payload.toolName === 'search_hadiths') {
                  streamStatusText.value = 'Mencari database hadis...';
                } else if (payload.toolName === 'check_hadith_integrity') {
                  streamStatusText.value = 'Mengecek rantai transmisi perawi...';
                } else if (payload.toolName === 'query_hadith_insights') {
                  streamStatusText.value = 'Mengekstrak wawasan statistik...';
                }
                assistantMsg.statusText = streamStatusText.value;
              }
            }
          } catch (e) {
            // Raw text fallback if JSON parsing fails
            if (type === '0') {
              assistantMsg.content += payloadStr;
            }
          }
        }
      }
    }
  } catch (err: unknown) {
    console.error('Chat stream failed:', err);
    assistantMsg.content = 'Koneksi terputus atau terjadi kesalahan sistem.';
  } finally {
    assistantMsg.statusText = '';
    chatLoading.value = false;
    streamStatusText.value = '';
  }
};

// ----------------------------------------------------
// Lifecycle initialization
// ----------------------------------------------------
onMounted(() => {
  // Pre-populate with a general search to make the cold-start stunning
  handleSearch('Akal');
});
</script>

<template>
  <UContainer class="py-10 max-w-7xl mx-auto space-y-10">
    <!-- Header with Language Toggle -->
    <div class="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-white/10 pb-6">
      <div class="space-y-1 text-center sm:text-left">
        <h1 class="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 to-emerald-400 bg-clip-text text-transparent">
          {{ t.title }}
        </h1>
        <p class="text-sm text-neutral-400">
          Re-engineered Relational Knowledge and Grounded Retrieval-Augmented Generation
        </p>
      </div>

      <!-- Bilingual context toggle -->
      <div class="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-lg p-1">
        <UButton
          size="sm"
          :variant="lang === 'ID' ? 'solid' : 'ghost'"
          color="success"
          @click="lang = 'ID'"
        >
          Bahasa Indonesia
        </UButton>
        <UButton
          size="sm"
          :variant="lang === 'EN' ? 'solid' : 'ghost'"
          color="success"
          @click="lang = 'EN'"
        >
          English
        </UButton>
      </div>
    </div>

    <!-- Navigation Tabs (Search & Chat Assistant) -->
    <div class="flex justify-center border-b border-neutral-800">
      <div class="flex gap-4">
        <UButton
          variant="ghost"
          size="lg"
          class="pb-3 rounded-none border-b-2"
          :class="activeTab === 'search' ? 'border-success text-success' : 'border-transparent text-neutral-400'"
          icon="i-lucide-search"
          @click="activeTab = 'search'"
        >
          {{ t.searchTab }}
        </UButton>

        <UButton
          variant="ghost"
          size="lg"
          class="pb-3 rounded-none border-b-2"
          :class="activeTab === 'chat' ? 'border-success text-success' : 'border-transparent text-neutral-400'"
          icon="i-lucide-message-circle"
          @click="activeTab = 'chat'"
        >
          {{ t.chatTab }}
        </UButton>
      </div>
    </div>

    <!-- ========================================================================================= -->
    <!-- tab 1: SEARCH DASHBOARD -->
    <!-- ========================================================================================= -->
    <div v-if="activeTab === 'search'" class="space-y-8">
      <!-- Search Input Area -->
      <div class="space-y-4">
        <div class="flex gap-3">
          <UInput
            v-model="searchQuery"
            class="flex-1"
            size="xl"
            icon="i-lucide-search"
            :placeholder="t.searchPlaceholder"
            @keyup.enter="handleSearch()"
          />
          <UButton
            size="xl"
            color="success"
            :loading="searchLoading"
            @click="handleSearch()"
          >
            {{ t.searchBtn }}
          </UButton>
        </div>

        <!-- Suggested Search Pills (Fogg Prompt Trigger / Cold Start) -->
        <div class="flex flex-wrap items-center gap-2 text-sm text-neutral-400">
          <span>{{ t.suggestedLabel }}</span>
          <UButton
            v-for="pill in t.suggestedPills"
            :key="pill"
            variant="subtle"
            size="sm"
            color="neutral"
            @click="handleSearch(pill)"
          >
            "{{ pill }}"
          </UButton>
        </div>
      </div>

      <!-- Advanced Filter Drawer / Collapse -->
      <div class="border border-neutral-800 rounded-xl p-4 bg-neutral-900/50 backdrop-blur-md">
        <div class="flex justify-between items-center cursor-pointer" @click="isFiltersOpen = !isFiltersOpen">
          <div class="flex items-center gap-2 font-medium text-sm text-neutral-300">
            <UIcon name="i-lucide-sliders-horizontal" class="w-4 h-4 text-success" />
            {{ t.advancedFilters }}
          </div>
          <UIcon :name="isFiltersOpen ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="w-4 h-4 text-neutral-500" />
        </div>

        <UCollapse :open="isFiltersOpen">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-neutral-800 mt-4">
            <!-- Book Filter -->
            <div class="space-y-2">
              <label class="text-xs font-semibold text-neutral-400 block">{{ t.bookFilter }}</label>
              <USelect
                v-model="filterBook"
                class="w-full"
                :items="[{ label: t.allBooks, value: '' }, ...booksList.map(b => ({ label: b.name, value: b.id }))]"
              />
            </div>

            <!-- Volume Filter -->
            <div class="space-y-2">
              <label class="text-xs font-semibold text-neutral-400 block">{{ t.volumeFilter }}</label>
              <div class="flex items-center gap-4">
                <input
                  v-model.number="filterVolume"
                  type="range"
                  min="1"
                  max="15"
                  class="flex-1 accent-success-500"
                />
                <span class="text-sm font-mono text-neutral-300">{{ filterVolume || t.allVolumes }}</span>
              </div>
            </div>

            <!-- Grading Filter -->
            <div class="space-y-2">
              <label class="text-xs font-semibold text-neutral-400 block">{{ t.gradingFilter }}</label>
              <div class="flex flex-wrap gap-3">
                <label class="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                  <input type="checkbox" :value="1" v-model="filterGrading" class="rounded accent-emerald-500" />
                  {{ t.authentic }}
                </label>
                <label class="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                  <input type="checkbox" :value="2" v-model="filterGrading" class="rounded accent-emerald-500" />
                  {{ t.good }}
                </label>
                <label class="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                  <input type="checkbox" :value="3" v-model="filterGrading" class="rounded accent-emerald-500" />
                  {{ t.weak }}
                </label>
                <label class="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                  <input type="checkbox" :value="0" v-model="filterGrading" class="rounded accent-emerald-500" />
                  {{ t.unverified }}
                </label>
              </div>
            </div>
          </div>
        </UCollapse>
      </div>

      <!-- Results Grid -->
      <div v-if="searchLoading" class="flex flex-col items-center py-20 space-y-4">
        <USpinner size="lg" color="success" />
        <p class="text-sm text-neutral-400">{{ t.loadingSearch }}</p>
      </div>

      <div v-else-if="results.length === 0" class="text-center py-20 border border-dashed border-neutral-800 rounded-2xl">
        <UIcon name="i-lucide-scroll" class="w-12 h-12 text-neutral-600 mx-auto mb-4" />
        <p class="text-neutral-400 max-w-md mx-auto">{{ t.emptyResults }}</p>
      </div>

      <div v-else class="space-y-8">
        <div
          v-for="h in results"
          :key="h.hadithid"
          class="border border-neutral-800/80 bg-neutral-900/40 rounded-2xl p-6 hover:border-success/30 transition-all duration-300 space-y-6 backdrop-blur-md"
        >
          <!-- Hadith Header Info -->
          <div class="flex flex-wrap justify-between items-center gap-4 border-b border-neutral-800/80 pb-4">
            <div class="space-y-1">
              <div class="font-bold text-lg text-neutral-200">
                {{ h.bookenglishname || h.bookname }} (Vol. {{ h.volume }}, No. {{ h.hadithidinbook }})
              </div>
              <div class="text-xs text-neutral-500 uppercase tracking-wider">
                {{ h.category }} / {{ h.chapter }}
              </div>
            </div>

            <!-- Grading Badge & Level 0 Popover -->
            <div class="flex items-center gap-2">
              <UBadge :color="getGradingColor(h.consolidatedgradinglevel)" variant="solid">
                {{ t.gradingLabel }} {{ getGradingName(h.consolidatedgradinglevel) }}
              </UBadge>

              <!-- Level 0 Disclaimer Tooltip -->
              <UPopover v-if="h.consolidatedgradinglevel === 0" mode="hover">
                <template #default>
                  <span class="text-error-500 font-extrabold cursor-help text-lg animate-pulse">*</span>
                </template>
                <template #content>
                  <div class="p-3 max-w-xs text-xs leading-relaxed text-neutral-300 bg-neutral-950 border border-neutral-800 rounded-lg shadow-xl">
                    {{ t.unverifiedDisclaimer }}
                  </div>
                </template>
              </UPopover>
            </div>
          </div>

          <!-- Matn Arabic -->
          <div class="text-right font-serif text-2xl leading-loose text-amber-200/90 py-2 font-medium" dir="rtl">
            {{ h.arabicmatn }}
          </div>

          <!-- Matn Translation (ID / EN) -->
          <div class="text-neutral-300 leading-relaxed text-base border-l-2 border-emerald-500/50 pl-4 py-1">
            {{ lang === 'ID' ? h.indonesianmatn : h.englishmatn }}
          </div>

          <!-- Action Footnotes & Transmission chains -->
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-4 border-t border-neutral-800/80">
            <!-- Scholarly consensus -->
            <div class="text-xs text-neutral-400 italic">
              {{ lang === 'ID' ? h.scholarlyconsensusid : h.scholarlyconsensusen }}
            </div>

            <!-- Primary actions -->
            <div class="flex gap-2 w-full md:w-auto">
              <UButton
                variant="outline"
                color="success"
                icon="i-lucide-git-branch"
                size="sm"
                @click="viewHadithIntegrity(h.hadithid)"
              >
                {{ t.narratorLabel }}
              </UButton>

              <UButton
                variant="ghost"
                color="neutral"
                icon="i-lucide-copy"
                size="sm"
                @click="handleCopyCitation(h)"
              >
                {{ t.copyCitation }}
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================================================================= -->
    <!-- tab 2: theological Assistant Grounded Chat -->
    <!-- ========================================================================================= -->
    <div v-else-if="activeTab === 'chat'" class="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <!-- Chat Interface -->
      <div class="lg:col-span-3 flex flex-col h-[650px] border border-neutral-800 rounded-2xl bg-neutral-900/30 overflow-hidden backdrop-blur-md">
        <!-- Messages Window -->
        <div class="flex-1 overflow-y-auto p-6 space-y-6">
          <!-- Welcome message if empty -->
          <div v-if="chatMessages.length === 0" class="text-center py-10 space-y-4">
            <UIcon name="i-lucide-bot" class="w-12 h-12 text-success mx-auto mb-2" />
            <p class="text-neutral-300 font-medium text-lg">Asisten RAG Syiah</p>
            <p class="text-neutral-400 text-sm max-w-md mx-auto leading-relaxed">
              {{ t.chatIntro }}
            </p>
          </div>

          <div
            v-for="msg in chatMessages"
            :key="msg.id"
            class="flex flex-col space-y-3"
            :class="msg.role === 'user' ? 'items-end' : 'items-start'"
          >
            <!-- Sender label -->
            <span class="text-xs text-neutral-500 px-1 font-medium">
              {{ msg.role === 'user' ? 'Anda' : 'Asisten Ahli' }}
            </span>

            <!-- Content Bubble -->
            <div
              class="max-w-[85%] rounded-2xl p-4 leading-relaxed text-sm whitespace-pre-wrap shadow-md"
              :class="msg.role === 'user'
                ? 'bg-success-600 text-white rounded-tr-none'
                : 'bg-neutral-800 text-neutral-200 rounded-tl-none border border-neutral-700/50'"
            >
              <!-- Typewriter status for thought loop -->
              <div v-if="msg.statusText" class="flex items-center gap-2 text-xs italic text-amber-400 py-1">
                <USpinner size="xs" color="warning" />
                <span>{{ msg.statusText }}</span>
              </div>

              <!-- Main message text -->
              <p>{{ msg.content }}</p>

              <!-- Citations Link Badges at the bottom of response -->
              <div v-if="msg.citations && msg.citations.length > 0" class="mt-4 pt-3 border-t border-white/10 space-y-2">
                <div class="text-xs font-semibold text-success-400 uppercase tracking-wider flex items-center gap-1">
                  <UIcon name="i-lucide-bookmark" class="w-3.5 h-3.5" />
                  {{ t.sourceCitations }}
                </div>
                <div class="flex flex-wrap gap-2">
                  <UButton
                    v-for="cit in msg.citations"
                    :key="cit.hadithid"
                    size="xs"
                    color="neutral"
                    variant="subtle"
                    class="font-medium text-neutral-300"
                    @click="openHadithDetail(cit)"
                  >
                    {{ cit.bookname }} (Vol. {{ cit.volume }}, Hal. {{ cit.hadithidinbook }})
                  </UButton>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Input Box Area -->
        <div class="border-t border-neutral-800 p-4 bg-neutral-950/50 flex gap-2">
          <UInput
            v-model="chatInput"
            class="flex-1"
            size="md"
            icon="i-lucide-sparkles"
            :placeholder="t.chatPlaceholder"
            :disabled="chatLoading"
            @keyup.enter="handleSendChatMessage()"
          />
          <UButton
            size="md"
            color="success"
            icon="i-lucide-arrow-right"
            :loading="chatLoading"
            @click="handleSendChatMessage()"
          />
        </div>
      </div>

      <!-- Quick Suggested Questions Sidebar -->
      <div class="lg:col-span-1 border border-neutral-800 rounded-2xl p-6 bg-neutral-900/20 backdrop-blur-md space-y-4">
        <h3 class="font-bold text-sm text-neutral-300 uppercase tracking-widest flex items-center gap-2">
          <UIcon name="i-lucide-lightbulb" class="text-amber-400 w-4 h-4" />
          Brainstorming
        </h3>
        <div class="space-y-3">
          <UButton
            variant="subtle"
            size="sm"
            color="neutral"
            class="w-full justify-start text-left leading-relaxed text-xs p-3 text-neutral-400"
            @click="chatInput = 'Mengapa akal dianggap sebagai hujah pertama oleh Imam al-Kazhim? Jelaskan dari kitab Al-Kafi.'; handleSendChatMessage();"
          >
            "Mengapa akal dianggap hujah pertama?"
          </UButton>
          <UButton
            variant="subtle"
            size="sm"
            color="neutral"
            class="w-full justify-start text-left leading-relaxed text-xs p-3 text-neutral-400"
            @click="chatInput = 'Berikan hadis shahih mengenai keutamaan sholat berjamaah beserta detail sanadnya.'; handleSendChatMessage();"
          >
            "Cari hadis sholat berjamaah shahih"
          </UButton>
          <UButton
            variant="subtle"
            size="sm"
            color="neutral"
            class="w-full justify-start text-left leading-relaxed text-xs p-3 text-neutral-400"
            @click="chatInput = 'Jelaskan mengenai hakekat Tauhid menurut ucapan Imam Ali (as).'; handleSendChatMessage();"
          >
            "Hakekat Tauhid menurut Imam Ali (as)"
          </UButton>
        </div>
      </div>
    </div>

    <!-- ========================================================================================= -->
    <!-- SLIDEOVER DRAWER: NARRATOR BIOGRAPHY -->
    <!-- ========================================================================================= -->
    <USlideover v-model:open="isBioOpen" :title="t.bioTitle">
      <template #content>
        <div v-if="bioLoading" class="flex flex-col items-center justify-center h-full py-40 space-y-4">
          <USpinner size="lg" color="success" />
          <p class="text-sm text-neutral-400">{{ t.loadingBio }}</p>
        </div>

        <div v-else-if="activeNarrator" class="space-y-6 p-6 overflow-y-auto">
          <!-- Standard names header -->
          <div class="border-b border-neutral-800 pb-4">
            <h2 class="text-2xl font-bold text-neutral-100">
              {{ activeNarrator.standardnameen || activeNarrator.standardnamear }}
            </h2>
            <p v-if="activeNarrator.kunya" class="text-sm text-success-400 font-medium">
              Kunya: {{ activeNarrator.kunya }}
            </p>
          </div>

          <!-- Quick facts grid -->
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-neutral-900 p-3 rounded-lg border border-neutral-800">
              <span class="text-xs text-neutral-500 block">{{ t.thabaqatLabel }}</span>
              <span class="text-sm font-semibold text-neutral-200">Generasi {{ activeNarrator.thabaqat }}</span>
            </div>

            <div class="bg-neutral-900 p-3 rounded-lg border border-neutral-800">
              <span class="text-xs text-neutral-500 block">{{ t.lifespanLabel }}</span>
              <span class="text-sm font-semibold text-neutral-200">
                {{ activeNarrator.deathhijri ? activeNarrator.deathhijri + ' H' : 'Unknown' }}
              </span>
            </div>

            <div class="bg-neutral-900 p-3 rounded-lg border border-neutral-800">
              <span class="text-xs text-neutral-500 block">{{ t.reliabilityLabel }}</span>
              <span class="text-sm font-semibold text-amber-400">{{ activeNarrator.reliability || 'Unverified' }}</span>
            </div>

            <div class="bg-neutral-900 p-3 rounded-lg border border-neutral-800">
              <span class="text-xs text-neutral-500 block">{{ t.schoolLabel }}</span>
              <span class="text-sm font-semibold text-neutral-200">{{ activeNarrator.schoolorsect || 'Unknown' }}</span>
            </div>
          </div>

          <!-- Biography Summary -->
          <div class="space-y-2">
            <h4 class="text-xs font-bold text-neutral-400 uppercase tracking-widest">
              Biografi Ringkas
            </h4>
            <p class="text-neutral-300 text-sm leading-relaxed">
              {{ lang === 'ID' ? activeNarrator.biographicalsummaryid : activeNarrator.biographicalsummaryen }}
            </p>
          </div>

          <!-- Aliases -->
          <div v-if="activeNarrator.aliases && activeNarrator.aliases.length > 0" class="space-y-2">
            <h4 class="text-xs font-bold text-neutral-400 uppercase tracking-widest">
              Nama Lain / Aliases
            </h4>
            <div class="flex flex-wrap gap-1.5">
              <UBadge v-for="a in activeNarrator.aliases" :key="a" size="xs" variant="subtle" color="neutral">
                {{ a }}
              </UBadge>
            </div>
          </div>
        </div>
      </template>
    </USlideover>

    <!-- ========================================================================================= -->
    <!-- MODAL: INTERACTIVE SILSILAH / TRANSMISSION CHAIN -->
    <!-- ========================================================================================= -->
    <UModal v-model:open="isIntegrityModalOpen" :title="t.integrityAnalysis">
      <template #content>
        <div v-if="integrityLoading" class="flex flex-col items-center justify-center py-40 space-y-4">
          <USpinner size="lg" color="success" />
          <p class="text-sm text-neutral-400">Mengevaluasi silsilah periwayatan...</p>
        </div>

        <div v-else-if="activeIntegrityResult" class="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
          <!-- Integrity Header Banner -->
          <div
            class="flex items-center gap-3 p-4 rounded-xl border"
            :class="activeIntegrityResult.is_continuous 
              ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-400' 
              : 'bg-rose-950/30 border-rose-500/20 text-rose-400'"
          >
            <UIcon
              :name="activeIntegrityResult.is_continuous ? 'i-lucide-check-circle-2' : 'i-lucide-alert-triangle'"
              class="w-6 h-6 flex-shrink-0"
            />
            <div>
              <h3 class="font-bold">
                {{ activeIntegrityResult.is_continuous ? t.integrityVerified : t.integrityBroken }}
              </h3>
              <p class="text-xs leading-relaxed mt-0.5 opacity-90">
                {{ activeIntegrityResult.analysis }}
              </p>
            </div>
          </div>

          <!-- SILSILAH TIMELINE GRAPH (Vertical Timeline Flow) -->
          <div class="space-y-4">
            <h4 class="text-xs font-bold text-neutral-400 uppercase tracking-widest">
              Rantai Silsilah Transmisi (Silsilah)
            </h4>

            <div class="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-neutral-800">
              <div
                v-for="(n, idx) in activeIntegrityResult.chain"
                :key="n.narratorid"
                class="relative flex flex-col sm:flex-row justify-between items-start gap-2 group"
              >
                <!-- Timeline Dot Indicator -->
                <div
                  class="absolute -left-[20px] top-1.5 w-3 h-3 rounded-full border bg-neutral-950 group-hover:scale-125 transition-transform"
                  :class="[
                    n.reliability === 'Thiqah' ? 'border-emerald-500 bg-emerald-500/20' : 'border-neutral-500',
                    idx === 0 ? 'ring-4 ring-success-500/20' : ''
                  ]"
                />

                <!-- Narrator Info Block -->
                <div class="space-y-1">
                  <div class="font-bold text-neutral-200 flex items-center gap-1.5">
                    {{ n.standardnameen || n.standardnamear }}
                    <span v-if="n.reliability === 'Thiqah'" class="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/20 px-1 rounded">
                      Thiqah
                    </span>
                  </div>
                  <div class="text-xs text-neutral-500 flex items-center gap-2">
                    <span>Thabaqat {{ n.thabaqat }}</span>
                    <span>•</span>
                    <span>Wafat: {{ n.deathhijri ? n.deathhijri + ' H' : 'Tidak Diketahui' }}</span>
                  </div>
                </div>

                <!-- Action Button inside chain -->
                <UButton
                  size="xs"
                  variant="subtle"
                  color="neutral"
                  icon="i-lucide-user"
                  @click="viewNarratorBiography(n.narratorid)"
                >
                  {{ t.viewBio }}
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <!-- ========================================================================================= -->
    <!-- MODAL: GROUNDED CITATION HADITH DETAIL -->
    <!-- ========================================================================================= -->
    <UModal v-model:open="isHadithModalOpen" :title="t.hadithTitle">
      <template #content>
        <div v-if="activeHadithModal" class="p-6 space-y-6 overflow-y-auto max-h-[85vh] leading-relaxed">
          <div class="border-b border-neutral-800 pb-4">
            <h3 class="text-xl font-bold text-neutral-100">
              {{ activeHadithModal.bookname }}
            </h3>
            <p class="text-xs text-neutral-500 uppercase tracking-widest mt-1">
              Volume {{ activeHadithModal.volume }}, Nomor {{ activeHadithModal.hadithidinbook }}
            </p>
          </div>

          <!-- Arabic -->
          <div class="text-right font-serif text-2xl leading-loose text-amber-200/90 py-2" dir="rtl">
            {{ activeHadithModal.arabic_matn || activeHadithModal.arabictext }}
          </div>

          <!-- Translation -->
          <div class="border-l-2 border-emerald-500/50 pl-4 text-neutral-300 text-sm md:text-base">
            {{ lang === 'ID' ? activeHadithModal.indonesian_matn : activeHadithModal.english_matn }}
          </div>

          <div v-if="activeHadithModal.url" class="pt-4 border-t border-neutral-800 flex justify-end">
            <UButton
              :to="activeHadithModal.url"
              target="_blank"
              icon="i-lucide-external-link"
              color="success"
              size="sm"
            >
              Lihat di Thaqalayn.net
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>

<style scoped>
/* Glassmorphism custom layouts */
.backdrop-blur-md {
  backdrop-filter: blur(12px);
}
</style>
