import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const projectRef = "pxlsmxbpgdfzjzuqtict";

export default defineConfig({
  // Aafnai Patro is one root SPA. Astronomy is a route inside it at /tools/astro.
  base: "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
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
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    sourcemap: false,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("react") || id.includes("scheduler")) return "react-vendor";
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("astronomy-engine")) return "astronomy";
          if (id.includes("hls.js")) return "media-player";
          if (id.includes("tesseract.js")) return "ocr-engine";
          if (id.includes("html2pdf.js") || id.includes("html2canvas") || id.includes("jspdf")) return "document-export";
          if (id.includes("lucide-react")) return "icons";
          return undefined;
        }
      }
    }
  }
});
