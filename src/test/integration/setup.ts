import { existsSync } from "fs";
import path from "path";

// Vitest doesn't load .env.local the way Next.js does — read it directly.
const envPath = path.resolve(__dirname, "../../../.env.local");
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error(
    "Integration tests need NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY " +
      "(from .env.local) — these hit the real Supabase project, not a mock.",
  );
}
