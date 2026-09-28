import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import type { ServerResponse } from "node:http";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        // When the backend is down, answer quietly so the browser console stays clean;
        // the client sees the header and switches to offline demo mode (bundled fixtures).
        configure: (proxy) => {
          proxy.on("error", (_err, _req, res) => {
            const r = res as ServerResponse;
            if (r.headersSent || typeof r.writeHead !== "function") return;
            r.writeHead(200, { "content-type": "application/json", "x-praman-offline": "1" });
            r.end('{"offline":true}');
          });
        },
      },
    },
  },
  build: { chunkSizeWarningLimit: 2000 },
});
