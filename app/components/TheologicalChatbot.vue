<script setup lang="ts">
import { ref, computed } from 'vue';
import { useChat } from '@ai-sdk/vue';
import { isReasoningUIPart, isTextUIPart, isToolUIPart, getToolName, DefaultChatTransport } from 'ai';
import { isPartStreaming, isToolStreaming } from '@nuxt/ui/utils/ai';
import { marked } from 'marked';

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

const props = defineProps<{
  lang: 'ID' | 'EN';
}>();

const emit = defineEmits<{
  (e: 'view-hadith', citation: CitationType): void;
}>();

const input = ref('');
const openReasoning = ref<Record<string, boolean>>({});

// Use standard @ai-sdk/vue useChat composable linked to /api/chat
const { messages, status, error, sendMessage, regenerate, stop } = useChat({
  transport: new DefaultChatTransport({
    api: '/api/chat',
  }),
  onError(err) {
    console.error('Chat error:', err);
  }
});

const t = computed(() => {
  if (props.lang === 'ID') {
    return {
      chatIntro: 'Selamat datang di Asisten Grounded AI Teologi Syiah. Tanyakan pertanyaan mengenai teologi, akidah, atau hukum, dan asisten akan mencarikan hadis orisinal dari database serta memvalidasi kesahihan sanadnya.',
      chatPlaceholder: 'Tanyakan sesuatu tentang hadis Syiah...',
      suggestedTitle: 'Saran Kueri',
      citationsLabel: 'Rujukan Terkait:',
      searchHadithsText: 'Mencari database hadis...',
      checkIntegrityText: 'Mengecek rantai transmisi perawi...',
      insightsText: 'Mengekstrak wawasan statistik...',
      thinkingProcess: 'Proses Berpikir (Reasoning)'
    };
  }
  return {
    chatIntro: 'Welcome to the Grounded Shia Theological AI Assistant. Ask questions about theology, doctrine, or laws, and the assistant will query the original database and validate the sanad authenticity.',
    chatPlaceholder: 'Ask something about Shia hadiths...',
    suggestedTitle: 'Suggested Queries',
    citationsLabel: 'Related Citations:',
    searchHadithsText: 'Searching hadith database...',
    checkIntegrityText: 'Checking narrator transmission chains...',
    insightsText: 'Extracting analytical insights...',
    thinkingProcess: 'Thinking Process'
  };
});

function onSubmit() {
  const text = input.value.trim();
  if (!text) return;
  
  sendMessage({ text });
  input.value = '';
}

// Extract tool outputs / citations from tool parts in the message
const getCitationsFromMessage = (message: any): CitationType[] => {
  if (!message.parts) return [];
  const citations: CitationType[] = [];
  
  for (const part of message.parts) {
    const toolPart = part as any;
    if (isToolUIPart(part) && toolPart.state === 'output-available' && toolPart.output) {
      const toolName = getToolName(part);
      if (toolName === 'search_hadiths' && Array.isArray(toolPart.output)) {
        // Map search results to citations
        for (const h of toolPart.output) {
          citations.push({
            hadithid: h.hadithid,
            bookname: h.bookname,
            volume: h.volume,
            hadithidinbook: h.hadithidinbook,
            indonesian_matn: h.indonesianmatn,
            english_matn: h.englishmatn,
            arabic_matn: h.arabicmatn,
            url: h.url
          });
        }
      }
    }
  }
  
  return citations;
};

// Help map tool names to display status texts
const getToolStatusText = (part: any) => {
  const name = getToolName(part);
  if (name === 'search_hadiths') return t.value.searchHadithsText;
  if (name === 'check_hadith_integrity') return t.value.checkIntegrityText;
  if (name === 'query_hadith_insights') return t.value.insightsText;
  return `Executing ${name}...`;
};
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
    <!-- Chat Interface using Nuxt UI AI Chat Components -->
    <div class="lg:col-span-3 flex flex-col h-[650px] border border-neutral-800 rounded-2xl bg-neutral-900/30 overflow-hidden backdrop-blur-md">
      <!-- Scrollable Message List with Auto-scroll -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6">
        <!-- Welcome Message -->
        <div v-if="messages.length === 0" class="text-center py-10 space-y-4">
          <UIcon name="i-lucide-bot" class="w-12 h-12 text-success mx-auto mb-2 animate-bounce" />
          <p class="text-neutral-300 font-medium text-lg">Asisten RAG Syiah</p>
          <p class="text-neutral-400 text-sm max-w-md mx-auto leading-relaxed">
            {{ t.chatIntro }}
          </p>
        </div>

        <UChatMessages
          v-else
          :messages="messages"
          :status="status"
        >
          <template #content="{ message }">
            <template
              v-for="(part, index) in message.parts"
              :key="`${message.id}-${part.type}-${index}`"
            >
              <!-- Collapsible thinking/reasoning process (Gemini thinking) -->
              <div v-if="isReasoningUIPart(part)" class="border border-neutral-800 rounded-xl bg-neutral-950/30 overflow-hidden my-3">
                <div 
                  class="flex justify-between items-center px-4 py-3 cursor-pointer hover:bg-neutral-800/30 transition-colors" 
                  @click="openReasoning[message.id] = !openReasoning[message.id]"
                >
                  <div class="flex items-center gap-2 font-medium text-xs text-neutral-400">
                    <UIcon name="i-lucide-brain" class="w-4 h-4 text-purple-400 animate-pulse" />
                    {{ t.thinkingProcess }}
                  </div>
                  <UIcon :name="openReasoning[message.id] ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="w-4 h-4 text-neutral-500" />
                </div>

                <UCollapsible :open="openReasoning[message.id]">
                  <template #content>
                    <div class="px-4 pb-4 pt-1 text-xs text-neutral-400 leading-relaxed border-t border-neutral-800/50 bg-neutral-950/20 whitespace-pre-wrap">
                      {{ part.text }}
                    </div>
                  </template>
                </UCollapsible>
              </div>

              <!-- Tool call execution status -->
              <UChatTool
                v-else-if="isToolUIPart(part)"
                :text="getToolStatusText(part)"
                :streaming="isToolStreaming(part)"
              />

              <!-- Render plain text messages or streamed Markdown -->
              <template v-else-if="isTextUIPart(part)">
                <div v-if="message.role === 'assistant'" class="prose prose-invert max-w-none text-neutral-200" v-html="marked.parse(part.text)" />
                <p v-else-if="message.role === 'user'" class="whitespace-pre-wrap text-white">
                  {{ part.text }}
                </p>
              </template>
            </template>

            <!-- Grounded Citation link badges for tool calling matches -->
            <div
              v-if="message.role === 'assistant' && getCitationsFromMessage(message).length > 0"
              class="mt-4 pt-3 border-t border-white/10 space-y-2"
            >
              <div class="text-xs font-semibold text-success-400 uppercase tracking-wider flex items-center gap-1">
                <UIcon name="i-lucide-bookmark" class="w-3.5 h-3.5" />
                {{ t.citationsLabel }}
              </div>
              <div class="flex flex-wrap gap-2">
                <UButton
                  v-for="cit in getCitationsFromMessage(message)"
                  :key="cit.hadithid"
                  size="xs"
                  color="neutral"
                  variant="subtle"
                  class="font-medium text-neutral-300"
                  @click="emit('view-hadith', cit)"
                >
                  {{ cit.bookname }} (Vol. {{ cit.volume }}, Hal. {{ cit.hadithidinbook }})
                </UButton>
              </div>
            </div>
          </template>
        </UChatMessages>
      </div>

      <!-- Enhanced Chat Prompt from Nuxt UI -->
      <UChatPrompt
        v-model="input"
        :error="error || undefined"
        :placeholder="t.chatPlaceholder"
        class="border-t border-neutral-800 p-4 bg-neutral-950/50"
        @submit="onSubmit"
      >
        <UChatPromptSubmit
          :status="status"
          @stop="stop()"
          @reload="regenerate()"
        />
      </UChatPrompt>
    </div>

    <!-- suggested sidebar -->
    <div class="lg:col-span-1 border border-neutral-800 rounded-2xl p-6 bg-neutral-900/20 backdrop-blur-md space-y-4">
      <h3 class="font-bold text-sm text-neutral-300 uppercase tracking-widest flex items-center gap-2">
        <UIcon name="i-lucide-lightbulb" class="text-amber-400 w-4 h-4" />
        {{ t.suggestedTitle }}
      </h3>
      <div class="space-y-3">
        <UButton
          variant="subtle"
          size="sm"
          color="neutral"
          class="w-full justify-start text-left leading-relaxed text-xs p-3 text-neutral-400"
          @click="input = 'Mengapa akal dianggap sebagai hujah pertama oleh Imam al-Kazhim? Jelaskan dari kitab Al-Kafi.'; onSubmit();"
        >
          "Mengapa akal dianggap hujah pertama?"
        </UButton>
        <UButton
          variant="subtle"
          size="sm"
          color="neutral"
          class="w-full justify-start text-left leading-relaxed text-xs p-3 text-neutral-400"
          @click="input = 'Berikan hadis shahih mengenai keutamaan sholat berjamaah beserta detail sanadnya.'; onSubmit();"
        >
          "Cari hadis sholat berjamaah shahih"
        </UButton>
        <UButton
          variant="subtle"
          size="sm"
          color="neutral"
          class="w-full justify-start text-left leading-relaxed text-xs p-3 text-neutral-400"
          @click="input = 'Jelaskan mengenai hakekat Tauhid menurut ucapan Imam Ali (as).'; onSubmit();"
        >
          "Hakekat Tauhid menurut Imam Ali (as)"
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
