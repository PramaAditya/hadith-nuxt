<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import HadithCard from '../components/HadithCard.vue';
import HadithSearchFilters from '../components/HadithSearchFilters.vue';
import TheologicalChatbot from '../components/TheologicalChatbot.vue';
import NarratorBioDrawer from '../components/NarratorBioDrawer.vue';
import HadithDetailModal from '../components/HadithDetailModal.vue';
import HadithIntegrityModal from '../components/HadithIntegrityModal.vue';

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

interface CitationType {
  hadithid: number;
  bookname: string;
  volume: number;
  hadithidinbook: number;
  indonesian_matn?: string;
  english_matn?: string;
  arabic_matn?: string;
  url?: string;
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
      searchBtn: 'Cari',
      chatTab: 'Asisten Teologi AI',
      searchTab: 'Pencarian Hibrida Vektor',
      emptyResults: 'Tidak ada hadis yang ditemukan. Silakan masukkan kata kunci pencarian baru.',
      loadingSearch: 'Mencari database hadis...',
      copiedSuccess: 'Kutipan berhasil disalin!'
    };
  }
  return {
    title: 'Shia Hadith Relational Knowledge & RAG Platform',
    searchPlaceholder: 'Search theological hadiths, type here (e.g., "Virtue of Intellect")...',
    suggestedLabel: 'Suggested:',
    suggestedPills: ['Virtue of Intellect', 'Tawhid', 'Rules of Prayer', 'Ahlul Bayt'],
    searchBtn: 'Search',
    chatTab: 'Theological AI Assistant',
    searchTab: 'Vector Hybrid Search',
    emptyResults: 'No hadiths found. Please try a different query.',
    loadingSearch: 'Searching hadith database...',
    copiedSuccess: 'Citation copied successfully!'
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

// Selected Narrator Drawer States
const isBioOpen = ref(false);
const activeNarratorId = ref<number | null>(null);

// Selected Hadith Integrity Modal States
const isIntegrityModalOpen = ref(false);
const activeHadithIdForIntegrity = ref<number | null>(null);

// Selected Hadith Citation Detail Modal States
const isHadithModalOpen = ref(false);
const activeCitationDetail = ref<CitationType | null>(null);

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

// Open Silsilah / Integrity Modal
const openHadithIntegrity = (hadithId: number) => {
  activeHadithIdForIntegrity.value = hadithId;
  isIntegrityModalOpen.value = true;
};

// Open Narrator Biography Drawer
const openNarratorBio = (narratorId: number) => {
  activeNarratorId.value = narratorId;
  isBioOpen.value = true;
};

// Open Hadith Citation Detail Modal
const openHadithDetail = (citation: CitationType) => {
  activeCitationDetail.value = citation;
  isHadithModalOpen.value = true;
};

// Copy Citation chicago-style
const handleCopyCitation = (h: SearchHadithResult) => {
  const book = h.bookenglishname || h.bookname;
  const vol = h.volume;
  const page = h.hadithidinbook;
  const text = h.englishmatn || h.indonesianmatn || '';
  const url = h.url || 'https://thaqalayn.net';
  
  const gradingName = h.consolidatedgradinglevel === 1 
    ? (lang.value === 'ID' ? 'Shahih (Sangat Kuat)' : 'Sahih (Authentic)')
    : h.consolidatedgradinglevel === 2
    ? (lang.value === 'ID' ? 'Hasan (Baik)' : 'Hasan (Good)')
    : h.consolidatedgradinglevel === 3
    ? (lang.value === 'ID' ? 'Dhaif (Lemah)' : 'Daif (Weak)')
    : (lang.value === 'ID' ? 'Belum Diverifikasi' : 'Unverified');

  const citation = `"${text.substring(0, 150)}..." Di dalam ${book}, Vol. ${vol}, Hal. ${page}. Gradasi: ${gradingName}. Sumber: ${url}`;
  
  navigator.clipboard.writeText(citation).then(() => {
    alert(t.value.copiedSuccess);
  });
};

// Initial Cold Start Search
onMounted(() => {
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

      <!-- Bilingual toggle -->
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

    <!-- Navigation Tabs -->
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
    <!-- Tab 1: SEARCH DASHBOARD -->
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

      <!-- Advanced Filter Drawer Component -->
      <HadithSearchFilters
        v-model:open="isFiltersOpen"
        v-model:book="filterBook"
        v-model:volume="filterVolume"
        v-model:grading="filterGrading"
        :lang="lang"
      />

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
        <HadithCard
          v-for="h in results"
          :key="h.hadithid"
          :hadith="h"
          :lang="lang"
          @view-silsilah="openHadithIntegrity"
          @copy-citation="handleCopyCitation"
        />
      </div>
    </div>

    <!-- ========================================================================================= -->
    <!-- Tab 2: THEOLOGICAL CHATBOT (Nuxt UI Native) -->
    <!-- ========================================================================================= -->
    <div v-else-if="activeTab === 'chat'">
      <TheologicalChatbot :lang="lang" @view-hadith="openHadithDetail" />
    </div>

    <!-- ========================================================================================= -->
    <!-- MODALS & DRAWERS (Delegated to components) -->
    <!-- ========================================================================================= -->

    <!-- Narrator Biography Side-over Drawer -->
    <NarratorBioDrawer
      v-model:open="isBioOpen"
      :narrator-id="activeNarratorId"
      :lang="lang"
    />

    <!-- Hadith Integrity Checking Modal -->
    <HadithIntegrityModal
      v-model:open="isIntegrityModalOpen"
      :hadith-id="activeHadithIdForIntegrity"
      :lang="lang"
      @view-bio="openNarratorBio"
    />

    <!-- Hadith Citation Detail Modal -->
    <HadithDetailModal
      v-model:open="isHadithModalOpen"
      :citation="activeCitationDetail"
      :lang="lang"
    />
  </UContainer>
</template>
