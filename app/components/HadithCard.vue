<script setup lang="ts">
import { computed } from 'vue';

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

const props = defineProps<{
  hadith: SearchHadithResult;
  lang: 'ID' | 'EN';
}>();

defineEmits<{
  (e: 'view-silsilah', id: number): void;
  (e: 'copy-citation', h: SearchHadithResult): void;
}>();

const t = computed(() => {
  if (props.lang === 'ID') {
    return {
      gradingLabel: 'Gradasi:',
      narratorLabel: 'Transmisi Sanad',
      copyCitation: 'Salin Kutipan Chicago',
      unverifiedDisclaimer: 'Narasi ini tercatat secara historis dalam literatur klasik namun belum melalui evaluasi sanad formal oleh kritikus klasik (Majlisi/Behbudi).',
      authentic: 'Shahih (Sangat Kuat)',
      good: 'Hasan (Baik)',
      weak: 'Dhaif (Lemah)',
      unverified: 'Muraffaa / Belum Diverifikasi'
    };
  }
  return {
    gradingLabel: 'Grading:',
    narratorLabel: 'Chain of Transmission',
    copyCitation: 'Copy Chicago Citation',
    unverifiedDisclaimer: 'This narration is historically recorded in classical literature but has not undergone a formal evaluation of its sanad authenticity by classical critics (Majlisi/Behbudi).',
    authentic: 'Sahih (Authentic)',
    good: 'Hasan (Good)',
    weak: 'Daif (Weak)',
    unverified: 'Unverified / Level 0'
  };
});

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
</script>

<template>
  <div class="border border-neutral-800/80 bg-neutral-900/40 rounded-2xl p-6 hover:border-success/30 transition-all duration-300 space-y-6 backdrop-blur-md">
    <!-- Hadith Header Info -->
    <div class="flex flex-wrap justify-between items-center gap-4 border-b border-neutral-800/80 pb-4">
      <div class="space-y-1">
        <div class="font-bold text-lg text-neutral-200">
          {{ hadith.bookenglishname || hadith.bookname }} (Vol. {{ hadith.volume }}, No. {{ hadith.hadithidinbook }})
        </div>
        <div class="text-xs text-neutral-500 uppercase tracking-wider">
          {{ hadith.category }} / {{ hadith.chapter }}
        </div>
      </div>

      <!-- Grading Badge & Level 0 Popover -->
      <div class="flex items-center gap-2">
        <UBadge :color="getGradingColor(hadith.consolidatedgradinglevel)" variant="solid">
          {{ t.gradingLabel }} {{ getGradingName(hadith.consolidatedgradinglevel) }}
        </UBadge>

        <!-- Level 0 Disclaimer Tooltip -->
        <UPopover v-if="hadith.consolidatedgradinglevel === 0" mode="hover">
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
      {{ hadith.arabicmatn }}
    </div>

    <!-- Matn Translation (ID / EN) -->
    <div class="text-neutral-300 leading-relaxed text-base border-l-2 border-emerald-500/50 pl-4 py-1">
      {{ lang === 'ID' ? hadith.indonesianmatn : hadith.englishmatn }}
    </div>

    <!-- Action Footnotes & Transmission chains -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-4 border-t border-neutral-800/80">
      <!-- Scholarly consensus -->
      <div class="text-xs text-neutral-400 italic">
        {{ lang === 'ID' ? hadith.scholarlyconsensusid : hadith.scholarlyconsensusen }}
      </div>

      <!-- Primary actions -->
      <div class="flex gap-2 w-full md:w-auto">
        <UButton
          variant="outline"
          color="success"
          icon="i-lucide-git-branch"
          size="sm"
          @click="$emit('view-silsilah', hadith.hadithid)"
        >
          {{ t.narratorLabel }}
        </UButton>

        <UButton
          variant="ghost"
          color="neutral"
          icon="i-lucide-copy"
          size="sm"
          @click="$emit('copy-citation', hadith)"
        >
          {{ t.copyCitation }}
        </UButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backdrop-blur-md {
  backdrop-filter: blur(12px);
}
</style>
