import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/devices": { target: "http://127.0.0.1:3001", changeOrigin: true },
      "/data": { target: "http://127.0.0.1:3001", changeOrigin: true },
      "/stats": { target: "http://127.0.0.1:3001", changeOrigin: true },
      "/prediction": { target: "http://127.0.0.1:3001", changeOrigin: true },
      "/export": { target: "http://127.0.0.1:3001", changeOrigin: true },
      "/api": { target: "http://127.0.0.1:3001", changeOrigin: true },
      "/socket.io": { target: "http://127.0.0.1:3001", ws: true },
    },
  },
});
