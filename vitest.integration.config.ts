import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

// Separate from vitest.config.ts on purpose: these tests hit the real
// Supabase project over the network using the service-role key to set up
// fixtures, so they must never run as part of the default fast unit suite
// (no jsdom needed, and CI/contributors without the key shouldn't be blocked).
//
// loadEnv + test.env: Vite only exposes VITE_-prefixed vars on import.meta.env
// by default, but these tests run as plain Node and need
// SUPABASE_SERVICE_ROLE_KEY (deliberately not VITE_-prefixed, since it must
// never ship to the browser) on process.env too.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.integration.test.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 30_000,
    env: loadEnv('', process.cwd(), ''),
  },
})
