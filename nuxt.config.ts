// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  srcDir: 'src',
  modules: ['@nuxt/ui', '@pinia/nuxt'],
  nitro: {
    esbuild: {
      options: {
        minifyIdentifiers: true,
        minifySyntax: true,
        minifyWhitespace: true
        // drop: ["console"],
      }
    }
  },
  colorMode: {
    preference: 'light',
    fallback: 'light',
    classSuffix: ''
  },
  pinia: {
    storesDirs: ['./src/stores/**']
  }
});
