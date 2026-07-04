<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import HadithSilsilahTimeline from './HadithSilsilahTimeline.vue';

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

const open = defineModel<boolean>('open', { default: false });
const props = defineProps<{
  hadithId: number | null;
  lang: 'ID' | 'EN';
}>();

defineEmits<{
  (e: 'view-bio', id: number): void;
}>();

const result = ref<IntegrityResult | null>(null);
const loading = ref(false);

const t = computed(() => {
  if (props.lang === 'ID') {
    return {
      integrityAnalysis: 'Analisis Integritas Sanad',
      integrityVerified: 'Sanad Bersambung (Muttashil)',
      integrityBroken: 'Sanad Terputus / Ada Celah',
      timelineLabel: 'Rantai Silsilah Transmisi (Silsilah)',
      loadingIntegrity: 'Mengevaluasi silsilah periwayatan...'
    };
  }
  return {
    integrityAnalysis: 'Sanad Integrity Analysis',
    integrityVerified: 'Continuous Chain (Muttashil)',
    integrityBroken: 'Broken Chain / Gaps Detected',
    timelineLabel: 'Chain of Transmission (Silsilah)',
    loadingIntegrity: 'Evaluating silsilah transmission chain...'
  };
});

// Fetch integrity check when hadithId changes and is open
watch(() => props.hadithId, async (newId) => {
  if (!newId) {
    result.value = null;
    return;
  }
  loading.value = true;
  try {
    const res = await $fetch(`/api/v1/hadiths/${newId}/integrity`) as IntegrityResult;
    result.value = res;
  } catch (err) {
    console.error('Failed to run integrity check:', err);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <UModal v-model:open="open" :title="t.integrityAnalysis">
    <template #content>
      <div v-if="loading" class="flex flex-col items-center justify-center py-40 space-y-4">
        <UIcon name="i-lucide-loader-circle" class="animate-spin w-8 h-8 text-success" />
        <p class="text-sm text-neutral-400">{{ t.loadingIntegrity }}</p>
      </div>

      <div v-else-if="result" class="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
        <!-- Integrity Header Banner -->
        <div
          class="flex items-center gap-3 p-4 rounded-xl border"
          :class="result.is_continuous 
            ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-400' 
            : 'bg-rose-950/30 border-rose-500/20 text-rose-400'"
        >
          <UIcon
            :name="result.is_continuous ? 'i-lucide-check-circle-2' : 'i-lucide-alert-triangle'"
            class="w-6 h-6 flex-shrink-0"
          />
          <div>
            <h3 class="font-bold">
              {{ result.is_continuous ? t.integrityVerified : t.integrityBroken }}
            </h3>
            <p class="text-xs leading-relaxed mt-0.5 opacity-90">
              {{ result.analysis }}
            </p>
          </div>
        </div>

        <!-- Silsilah Timeline -->
        <div class="space-y-4">
          <h4 class="text-xs font-bold text-neutral-400 uppercase tracking-widest">
            {{ t.timelineLabel }}
          </h4>

          <HadithSilsilahTimeline :chain="result.chain" @view-bio="$emit('view-bio', $event)" />
        </div>
      </div>
    </template>
  </UModal>
</template>
