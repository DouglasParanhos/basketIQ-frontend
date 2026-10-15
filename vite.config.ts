import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const API_TARGET = process.env.BASKETIQ_API_URL ?? "http://localhost:8000";

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "dev") },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon.svg", "icons/apple-touch-icon.png"],
      manifest: {
        name: "BasketIQ",
        short_name: "BasketIQ",
        description: "As suas compras de supermercado, lidas a partir das notas.",
        lang: "pt-PT",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#EEF2F7",
        theme_color: "#1D4E9E",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        // API responses hold personal data: never cached by the service worker.
        navigateFallbackDenylist: [/^\/v1\//],
        runtimeCaching: [],
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // HEIC conversion is only needed when someone picks a HEIC photo: fetched on demand.
        globIgnores: ["**/heic2any-*.js"],
      },
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // Same origin for the API so session cookies are first-party (BFF pattern).
      "/v1": { target: API_TARGET, changeOrigin: false },
    },
  },
  preview: {
    port: 4173,
    proxy: { "/v1": { target: API_TARGET, changeOrigin: false } },
  },
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router"],
          data: ["@tanstack/react-query", "openapi-fetch"],
          charts: ["recharts"],
          cropper: ["react-easy-crop"],
        },
      },
    },
  },
});
