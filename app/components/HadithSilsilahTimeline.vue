<script setup lang="ts">
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

defineProps<{
  chain: SilsilahNode[];
}>();

defineEmits<{
  (e: 'view-bio', id: number): void;
}>();
</script>

<template>
  <div class="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-neutral-800">
    <div
      v-for="(n, idx) in chain"
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

      <!-- Action Button -->
      <UButton
        size="xs"
        variant="subtle"
        color="neutral"
        icon="i-lucide-user"
        @click="$emit('view-bio', n.narratorid)"
      >
        Lihat Rijal
      </UButton>
    </div>
  </div>
</template>
