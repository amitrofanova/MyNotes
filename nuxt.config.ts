// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
  typescript: {
    strict: true,
  },
  modules: [
    '@pinia/nuxt',
    '@nuxt/eslint',
    '@nuxt/test-utils/module',
  ],
  css: ['~/assets/scss/main.scss'],
  nitro: {
    preset: 'static',
  },
  devtools: { enabled: true },
})
