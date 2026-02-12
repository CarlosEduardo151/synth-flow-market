import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isProduction =
    env.VITE_APP_ENV === "production" || mode === "production";

  return {
    server: {
      host: true,
      port: 8080,
      allowedHosts: ["starai.com.br"],
    },
    plugins: [react(), !isProduction && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@/integrations/supabase/client": path.resolve(
          __dirname,
          "./src/integrations/backend/client"
        ),
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
