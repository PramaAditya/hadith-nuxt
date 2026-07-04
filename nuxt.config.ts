// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  buildDir: '.nuxt',

  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxtjs/mcp-toolkit'
  ],

  mcp: {
    name: 'Shia Hadith MCP Server'
  },

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/': { prerender: true }
  },

  hooks: {
    close() {
      process.exit(0);
    }
  },

  compatibilityDate: '2026-06-30',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
