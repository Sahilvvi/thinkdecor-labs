// The edge functions run on Deno. The unit tests import their pure helpers
// (supabase/functions/_shared/catalog.ts) and stub this global per test.
declare const Deno: { env: { get(name: string): string | undefined } };
