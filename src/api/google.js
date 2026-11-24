/**
 * HTTP helper untuk Google REST API (Sheets & Drive), dipanggil LANGSUNG dari browser
 * dengan access token milik pengguna. Tidak ada server perantara.
 */
export class ApiError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

let tokenProvider = async () => { throw new ApiError('UNAUTHENTICATED', 'Belum masuk dengan Google.'); };
/** fn({forceRefresh}) -> Promise<accessToken>. Diatur oleh AuthContext. */
export const setTokenProvider = (fn) => { tokenProvider = fn; };

let retryDelay = 700;
export const setRetryDelay = (ms) => { retryDelay = ms; };

const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function describe(status, apiMessage = '') {
  const m = apiMessage.toLowerCase();
  if (status === 403 && (m.includes('has not been used') || m.includes('is disabled') || m.includes('not enabled'))) {
    return ['API_DISABLED', 'Google Sheets API / Google Drive API belum diaktifkan pada project Google Cloud aplikasi ini.'];
  }
  if (status === 401) return ['UNAUTHENTICATED', 'Sesi Google berakhir. Sambungkan kembali.'];
  if (status === 403) return ['FORBIDDEN', 'Akses ke spreadsheet ditolak. Pastikan izin Google Drive diberikan saat masuk.'];
  if (status === 404) return ['NOT_FOUND', 'Data atau spreadsheet tidak ditemukan.'];
  if (status === 429) return ['RATE_LIMIT', 'Terlalu banyak permintaan ke Google. Coba lagi sebentar.'];
  return ['API', apiMessage || `Permintaan gagal (${status}).`];
}

/**
 * @param opts.retry  false untuk operasi tambah (append): pengulangan otomatis bisa menggandakan baris.
 *                    Pemanggil bertanggung jawab atas idempotensi (cek ID sebelum menulis).
 */
export async function request(url, { method = 'GET', body, retry = true } = {}) {
  const maxRetries = retry ? MAX_RETRIES : 0;
  let attempt = 0;
  let forceRefresh = false;
  let refreshedOnce = false;

  for (;;) {
    const token = await tokenProvider({ forceRefresh });
    forceRefresh = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res;
    try {
      res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      if (attempt < maxRetries) { attempt += 1; await sleep(retryDelay * attempt); continue; }
      throw new ApiError('NETWORK', err.name === 'AbortError' ? 'Waktu permintaan habis. Periksa koneksi internet.' : 'Tidak dapat terhubung ke Google. Periksa koneksi internet.');
    }
    clearTimeout(timer);

    if (res.status === 401 && !refreshedOnce) { refreshedOnce = true; forceRefresh = true; continue; }
    if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) { attempt += 1; await sleep(retryDelay * attempt); continue; }

    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* abaikan */ }
    if (!res.ok) {
      const [code, message] = describe(res.status, json?.error?.message);
      throw new ApiError(code, message);
    }
    return json;
  }
}

export const qs = (params) => Object.entries(params)
  .flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => [k, x]) : [[k, v]]))
  .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
  .join('&');
