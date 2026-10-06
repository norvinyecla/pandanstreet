// Tests read SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from backend/.env.test
// (the test database, never the dev one in backend/.env) when it exists;
// variables already set (e.g. in CI) take precedence.
try {
  process.loadEnvFile('.env.test');
} catch {
  // No .env.test file: rely on the environment.
}
