import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    // Allow access through cloudflared / ngrok / any tunnel host.
    allowedHosts: true,
    // Proxy /api/* to the local Deno proxy so the browser only ever hits
    // the same origin as the page — works through a single tunnel.
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  build: { target: "es2022", sourcemap: true },
});
