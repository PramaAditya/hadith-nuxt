<script setup lang="ts">
import { computed, ref } from 'vue';

const open = defineModel<boolean>('open', { default: false });
const book = defineModel<string>('book', { default: '' });
const volume = defineModel<number | null>('volume', { default: null });
const grading = defineModel<number[]>('grading', { default: () => [] });

const props = defineProps<{
  lang: 'ID' | 'EN';
}>();

const t = computed(() => {
  if (props.lang === 'ID') {
    return {
      advancedFilters: 'Filter Lanjutan',
      bookFilter: 'Buku',
      volumeFilter: 'Volume',
      gradingFilter: 'Tingkat Keaslian',
      allBooks: 'Semua Buku',
      allVolumes: 'Semua Volume',
      authentic: 'Shahih (Sangat Kuat)',
      good: 'Hasan (Baik)',
      weak: 'Dhaif (Lemah)',
      unverified: 'Muraffaa / Belum Diverifikasi'
    };
  }
  return {
    advancedFilters: 'Advanced Filters',
    bookFilter: 'Book',
    volumeFilter: 'Volume',
    gradingFilter: 'Authenticity Tier',
    allBooks: 'All Books',
    allVolumes: 'All Volumes',
    authentic: 'Sahih (Authentic)',
    good: 'Hasan (Good)',
    weak: 'Daif (Weak)',
    unverified: 'Unverified / Level 0'
  };
});

const booksList = ref([
  { id: 'Al-Kafi-Volume-1-Kulayni', name: 'Al-Kafi - Vol 1' },
  { id: 'Al-Kafi-Volume-2-Kulayni', name: 'Al-Kafi - Vol 2' },
  { id: 'Man-La-Yahduruh-al-Faqih-Volume-1-Saduq', name: 'Man La Yahduruh al-Faqih - Vol 1' }
]);
</script>

<template>
  <div class="border border-neutral-800 rounded-xl p-4 bg-neutral-900/50 backdrop-blur-md">
    <div class="flex justify-between items-center cursor-pointer" @click="open = !open">
      <div class="flex items-center gap-2 font-medium text-sm text-neutral-300">
        <UIcon name="i-lucide-sliders-horizontal" class="w-4 h-4 text-success" />
        {{ t.advancedFilters }}
      </div>
      <UIcon :name="open ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="w-4 h-4 text-neutral-500" />
    </div>

    <UCollapse :open="open">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-neutral-800 mt-4">
        <!-- Book Filter -->
        <div class="space-y-2">
          <label class="text-xs font-semibold text-neutral-400 block">{{ t.bookFilter }}</label>
          <USelect
            v-model="book"
            class="w-full"
            :items="[{ label: t.allBooks, value: '' }, ...booksList.map(b => ({ label: b.name, value: b.id }))]"
          />
        </div>

        <!-- Volume Filter -->
        <div class="space-y-2">
          <label class="text-xs font-semibold text-neutral-400 block">{{ t.volumeFilter }}</label>
          <div class="flex items-center gap-4">
            <input
              v-model.number="volume"
              type="range"
              min="1"
              max="15"
              class="flex-1 accent-success-500"
            />
            <span class="text-sm font-mono text-neutral-300">{{ volume || t.allVolumes }}</span>
          </div>
        </div>

        <!-- Grading Filter -->
        <div class="space-y-2">
          <label class="text-xs font-semibold text-neutral-400 block">{{ t.gradingFilter }}</label>
          <div class="flex flex-wrap gap-3">
            <label class="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
              <input type="checkbox" :value="1" v-model="grading" class="rounded accent-emerald-500" />
              {{ t.authentic }}
            </label>
            <label class="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
              <input type="checkbox" :value="2" v-model="grading" class="rounded accent-emerald-500" />
              {{ t.good }}
            </label>
            <label class="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
              <input type="checkbox" :value="3" v-model="grading" class="rounded accent-emerald-500" />
              {{ t.weak }}
            </label>
            <label class="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
              <input type="checkbox" :value="0" v-model="grading" class="rounded accent-emerald-500" />
              {{ t.unverified }}
            </label>
          </div>
        </div>
      </div>
    </UCollapse>
  </div>
</template>

<style scoped>
.backdrop-blur-md {
  backdrop-filter: blur(12px);
}
</style>
