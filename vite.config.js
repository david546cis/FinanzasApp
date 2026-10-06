import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/FinanzasApp/',

  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',

      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
      ],

      manifest: {
        name: 'FinanzasApp',
        short_name: 'Finanzas',
        description:
          'Control de finanzas personales, pagos y dinero disponible.',

        theme_color: '#ffffff',
        background_color: '#ffffff',

        display: 'standalone',

        start_url: '/FinanzasApp/',
        scope: '/FinanzasApp/',

        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },

      workbox: {
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg}',
        ],
      },

      devOptions: {
        enabled: true,
      },
    }),
  ],
})