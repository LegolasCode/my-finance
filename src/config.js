// Konfigurasi dibaca dari environment Vite (lihat .env.example).
// Client ID bersifat publik; tidak ada rahasia yang disimpan di frontend.
export const config = {
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  appVersion: '2.0.0',
};
