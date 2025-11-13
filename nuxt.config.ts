// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  srcDir: 'src',
  modules: ['@nuxt/ui', '@pinia/nuxt'],
  nitro: {
    esbuild: {
      options: {
        // minifyIdentifiers: true,
        // minifySyntax: true,
        // minifyWhitespace: true,
        // drop: ['console']
      }
    }
  },
  vite: {
    build: {
      minify: process.env.NODE_ENV === 'development' ? false : 'terser',
      terserOptions: {
        compress: {
          // drop_console: true
        }
      }
    }
  },
  css: ['~/assets/css/main.css'],
  colorMode: {
    preference: 'light',
    fallback: 'light',
    classSuffix: ''
  },
  pinia: {
    storesDirs: ['./src/stores/**']
  }
});
