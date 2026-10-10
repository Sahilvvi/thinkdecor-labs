import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import wasm from "vite-plugin-wasm";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    historyApiFallback: true,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), wasm(), mode === "development" && componentTagger()].filter(Boolean),
  esbuild: {
    supported: {
      'top-level-await': true,
    },
  },
  build: {
    // Content-hashed bundles live in /static (cached for a year, see vercel.json).
    // /assets holds the hand-named files from public/, which can change in place.
    assetsDir: 'static',
    rollupOptions: {
      output: {
        // Long-lived vendor files: they rarely change, so returning visitors keep them cached
        // across deploys, and the app's own code stays small.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\/]node_modules[\/](react|react-dom|react-router|react-router-dom|scheduler)[\/]/.test(id)) return 'vendor-react';
          if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) return 'vendor-motion';
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('@radix-ui')) return 'vendor-radix';
          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
