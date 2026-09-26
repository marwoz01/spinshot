// Ładuje .env przed innymi modułami (import musi być pierwszy w server/index.ts).
try {
  process.loadEnvFile();
} catch {
  // Brak pliku .env — zmienne mogą pochodzić ze środowiska (np. hosting).
}
