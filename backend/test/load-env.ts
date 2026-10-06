// Tests read SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from backend/.env when
// it exists; variables already set (e.g. in CI) take precedence.
try {
  process.loadEnvFile('.env');
} catch {
  // No .env file: rely on the environment.
}
