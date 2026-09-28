import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const projectRef = "pxlsmxbpgdfzjzuqtict";

export default defineConfig({
  base: "/astro/",
  plugins: [react()],
  server: {
    proxy: {
      "/api/v1": {
        target: `https://${projectRef}.supabase.co`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/v1/, "/functions/v1/router")
      }
    }
  },
  build: {
    target: "es2022",
    sourcemap: true,
    cssCodeSplit: true
  }
});
