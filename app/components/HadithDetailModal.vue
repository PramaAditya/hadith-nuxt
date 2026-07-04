<script setup lang="ts">
import { computed } from 'vue';

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

const open = defineModel<boolean>('open', { default: false });
const props = defineProps<{
  citation: CitationType | null;
  lang: 'ID' | 'EN';
}>();

const t = computed(() => {
  if (props.lang === 'ID') {
    return {
      hadithTitle: 'Detail Rujukan Hadis',
      viewExternal: 'Lihat di Thaqalayn.net'
    };
  }
  return {
    hadithTitle: 'Hadith Reference Detail',
    viewExternal: 'View on Thaqalayn.net'
  };
});
</script>

<template>
  <UModal v-model:open="open" :title="t.hadithTitle">
    <template #content>
      <div v-if="citation" class="p-6 space-y-6 overflow-y-auto max-h-[85vh] leading-relaxed">
        <div class="border-b border-neutral-800 pb-4">
          <h3 class="text-xl font-bold text-neutral-100">
            {{ citation.bookname }}
          </h3>
          <p class="text-xs text-neutral-500 uppercase tracking-widest mt-1">
            Volume {{ citation.volume }}, Nomor {{ citation.hadithidinbook }}
          </p>
        </div>

        <!-- Arabic -->
        <div class="text-right font-serif text-2xl leading-loose text-amber-200/90 py-2" dir="rtl">
          {{ citation.arabic_matn }}
        </div>

        <!-- Translation -->
        <div class="border-l-2 border-emerald-500/50 pl-4 text-neutral-300 text-sm md:text-base">
          {{ lang === 'ID' ? citation.indonesian_matn : citation.english_matn }}
        </div>

        <div v-if="citation.url" class="pt-4 border-t border-neutral-800 flex justify-end">
          <UButton
            :to="citation.url"
            target="_blank"
            icon="i-lucide-external-link"
            color="success"
            size="sm"
          >
            {{ t.viewExternal }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
