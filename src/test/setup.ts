process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/hms-test";
process.env.SESSION_SECRET ??=
  "test-session-secret-at-least-32-characters-long";
process.env.SETUP_SECRET ??= "test-setup-secret-value";
process.env.APP_URL ??= "http://localhost:3000";
// Vitest sets NODE_ENV=test; do not reassign the read-only process.env.NODE_ENV.
