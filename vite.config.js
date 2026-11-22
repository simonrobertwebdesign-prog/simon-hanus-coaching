import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// "preview" mode builds one self-contained HTML file (for the clickable preview).
// Normal builds go to Netlify as usual.
export default defineConfig(({ mode }) => ({
  plugins: mode === "preview" ? [react(), viteSingleFile()] : [react()],
  build: {
    target: "es2022",
    outDir: mode === "preview" ? "preview-dist" : "dist",
    assetsInlineLimit: mode === "preview" ? 100000000 : 4096,
  },
}));
