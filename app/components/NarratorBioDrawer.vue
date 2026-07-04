<script setup lang="ts">
import { ref, computed, watch } from 'vue';

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

const open = defineModel<boolean>('open', { default: false });
const props = defineProps<{
  narratorId: number | null;
  lang: 'ID' | 'EN';
}>();

const narrator = ref<Narrator | null>(null);
const loading = ref(false);

const t = computed(() => {
  if (props.lang === 'ID') {
    return {
      bioTitle: 'Biografi Rijal Perawi',
      loadingBio: 'Memuat data biografi perawi...',
      thabaqatLabel: 'Thabaqat:',
      lifespanLabel: 'Tahun Wafat:',
      reliabilityLabel: 'Keandalan:',
      schoolLabel: 'Afiliasi:'
    };
  }
  return {
    bioTitle: 'Rijal Biography',
    loadingBio: 'Loading narrator biography...',
    thabaqatLabel: 'Thabaqat:',
    lifespanLabel: 'Year of Death:',
    reliabilityLabel: 'Reliability:',
    schoolLabel: 'Affiliation:'
  };
});

// Fetch narrator bio when id changes and is open
watch(() => props.narratorId, async (newId) => {
  if (!newId) {
    narrator.value = null;
    return;
  }
  loading.value = true;
  try {
    const res = await $fetch(`/api/v1/narrators/${newId}`) as Narrator;
    narrator.value = res;
  } catch (err) {
    console.error('Failed to load narrator:', err);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <USlideover v-model:open="open" :title="t.bioTitle">
    <template #content>
      <div v-if="loading" class="flex flex-col items-center justify-center h-full py-40 space-y-4">
        <USpinner size="lg" color="success" />
        <p class="text-sm text-neutral-400">{{ t.loadingBio }}</p>
      </div>

      <div v-else-if="narrator" class="space-y-6 p-6 overflow-y-auto">
        <!-- Standard names header -->
        <div class="border-b border-neutral-800 pb-4">
          <h2 class="text-2xl font-bold text-neutral-100">
            {{ narrator.standardnameen || narrator.standardnamear }}
          </h2>
          <p v-if="narrator.kunya" class="text-sm text-success-400 font-medium">
            Kunya: {{ narrator.kunya }}
          </p>
        </div>

        <!-- Quick facts grid -->
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-neutral-900 p-3 rounded-lg border border-neutral-800">
            <span class="text-xs text-neutral-500 block">{{ t.thabaqatLabel }}</span>
            <span class="text-sm font-semibold text-neutral-200">Generasi {{ narrator.thabaqat }}</span>
          </div>

          <div class="bg-neutral-900 p-3 rounded-lg border border-neutral-800">
            <span class="text-xs text-neutral-500 block">{{ t.lifespanLabel }}</span>
            <span class="text-sm font-semibold text-neutral-200">
              {{ narrator.deathhijri ? narrator.deathhijri + ' H' : 'Unknown' }}
            </span>
          </div>

          <div class="bg-neutral-900 p-3 rounded-lg border border-neutral-800">
            <span class="text-xs text-neutral-500 block">{{ t.reliabilityLabel }}</span>
            <span class="text-sm font-semibold text-amber-400">{{ narrator.reliability || 'Unverified' }}</span>
          </div>

          <div class="bg-neutral-900 p-3 rounded-lg border border-neutral-800">
            <span class="text-xs text-neutral-500 block">{{ t.schoolLabel }}</span>
            <span class="text-sm font-semibold text-neutral-200">{{ narrator.schoolorsect || 'Unknown' }}</span>
          </div>
        </div>

        <!-- Biography Summary -->
        <div class="space-y-2">
          <h4 class="text-xs font-bold text-neutral-400 uppercase tracking-widest">
            Biografi Ringkas
          </h4>
          <p class="text-neutral-300 text-sm leading-relaxed">
            {{ lang === 'ID' ? narrator.biographicalsummaryid : narrator.biographicalsummaryen }}
          </p>
        </div>

        <!-- Aliases -->
        <div v-if="narrator.aliases && narrator.aliases.length > 0" class="space-y-2">
          <h4 class="text-xs font-bold text-neutral-400 uppercase tracking-widest">
            Nama Lain / Aliases
          </h4>
          <div class="flex flex-wrap gap-1.5">
            <UBadge v-for="a in narrator.aliases" :key="a" size="xs" variant="subtle" color="neutral">
              {{ a }}
            </UBadge>
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>
