import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { config } from '../config.js';
import { ApiError, ensureWorkspace, setTokenProvider, bindSpreadsheet } from '../api/index.js';

/**
 * Login Google (OAuth token client) langsung dari browser.
 *  - `drive.file`: hanya akses ke file yang DIBUAT aplikasi ini di Drive pengguna (bukan seluruh Drive).
 *  - Access token disimpan di memori + sessionStorage (hilang saat tab ditutup), tidak pernah dikirim ke server mana pun
 *    selain Google. Tidak ada backend.
 */
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
export const SCOPES = ['openid', 'email', 'profile', DRIVE_SCOPE].join(' ');
const SESSION_KEY = 'ft_session';
const HINT_KEY = 'ft_hint';
const sheetKey = (sub) => `ft_sheet_${sub}`;
const REFRESH_MARGIN = 5 * 60_000;
const MIN_VALID = 60_000;

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function loadStored() {
  try {
    const s = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    if (s && s.expiresAt - Date.now() > MIN_VALID && s.spreadsheetId && s.user) return s;
  } catch { /* abaikan */ }
  return null;
}

const withTimeout = (promise, ms) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error('timeout'), { type: 'timeout' })), ms)),
]);

function messageFor(e) {
  if (e instanceof ApiError) return e.message;
  switch (e?.type) {
    case 'popup_closed': return 'Jendela login ditutup sebelum selesai. Coba lagi.';
    case 'popup_failed_to_open': return 'Popup login diblokir browser. Izinkan popup untuk situs ini lalu coba lagi.';
    case 'scope_denied': return 'Aplikasi membutuhkan izin Google Drive (hanya untuk file yang dibuat aplikasi ini). Centang izin tersebut saat masuk.';
    case 'access_denied': return 'Akses ditolak. Izinkan aplikasi untuk membuat dan mengelola spreadsheet-nya.';
    case 'timeout': return 'Login terlalu lama. Coba lagi.';
    default: return e?.message || 'Gagal masuk dengan Google.';
  }
}

export function AuthProvider({ children }) {
  const configured = Boolean(config.googleClientId);
  const getTokenRef = useRef(null);

  // Dipulihkan sinkron pada render pertama agar token & spreadsheet siap sebelum komponen anak memuat data.
  const [stored] = useState(() => {
    const s = loadStored();
    setTokenProvider((opts) => getTokenRef.current(opts));
    if (s) bindSpreadsheet(s.spreadsheetId, s.user.email);
    return s;
  });

  const [phase, setPhase] = useState(stored ? 'ready' : 'signedOut'); // signedOut | working | ready
  const [step, setStep] = useState('auth');
  const [user, setUser] = useState(stored?.user || null);
  const [workspace, setWorkspace] = useState(stored ? { spreadsheetId: stored.spreadsheetId, spreadsheetUrl: stored.spreadsheetUrl } : null);
  const [gsiReady, setGsiReady] = useState(false);
  const [authError, setAuthError] = useState('');
  const [needsReauth, setNeedsReauth] = useState(false);
  const [tokenVersion, setTokenVersion] = useState(0);

  const tokenRef = useRef(stored ? { accessToken: stored.accessToken, expiresAt: stored.expiresAt } : null);
  const userRef = useRef(user);
  const workspaceRef = useRef(workspace);
  const clientRef = useRef(null);
  const pendingRef = useRef(null);
  const refreshRef = useRef(null);
  userRef.current = user;
  workspaceRef.current = workspace;

  const persist = useCallback(() => {
    const t = tokenRef.current;
    const u = userRef.current;
    const w = workspaceRef.current;
    if (t && u && w) sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...t, user: u, ...w }));
  }, []);

  const storeToken = useCallback((resp) => {
    tokenRef.current = { accessToken: resp.access_token, expiresAt: Date.now() + (Number(resp.expires_in) || 3600) * 1000 };
    setTokenVersion((v) => v + 1);
    persist();
  }, [persist]);

  const requestToken = useCallback((options) => new Promise((resolve, reject) => {
    if (!clientRef.current) { reject(Object.assign(new Error('Google Sign-In belum siap.'), { type: 'gsi_not_ready' })); return; }
    pendingRef.current = { resolve, reject };
    clientRef.current.requestAccessToken(options);
  }), []);

  getTokenRef.current = async ({ forceRefresh = false } = {}) => {
    const t = tokenRef.current;
    if (!forceRefresh && t && t.expiresAt - Date.now() > MIN_VALID) return t.accessToken;
    if (!refreshRef.current) {
      refreshRef.current = (async () => {
        try {
          const resp = await withTimeout(requestToken({ prompt: '', hint: userRef.current?.email }), 20_000);
          storeToken(resp);
          setNeedsReauth(false);
          return tokenRef.current.accessToken;
        } catch {
          setNeedsReauth(true);
          throw new ApiError('UNAUTHENTICATED', 'Sesi Google berakhir. Klik "Sambungkan kembali".');
        } finally {
          refreshRef.current = null;
        }
      })();
    }
    return refreshRef.current;
  };

  // Muat Google Identity Services dan siapkan token client.
  useEffect(() => {
    if (!configured) return undefined;
    const init = () => {
      clientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: config.googleClientId,
        scope: SCOPES,
        callback: (resp) => {
          const p = pendingRef.current;
          pendingRef.current = null;
          if (!p) return;
          if (resp.error) { p.reject(Object.assign(new Error(resp.error_description || resp.error), { type: resp.error })); return; }
          if (!window.google.accounts.oauth2.hasGrantedAllScopes(resp, DRIVE_SCOPE)) { p.reject(Object.assign(new Error('scope_denied'), { type: 'scope_denied' })); return; }
          p.resolve(resp);
        },
        error_callback: (e) => {
          const p = pendingRef.current;
          pendingRef.current = null;
          p?.reject(Object.assign(new Error(e?.message || e?.type || 'gagal'), { type: e?.type }));
        },
      });
      setGsiReady(true);
    };
    if (window.google?.accounts?.oauth2) { init(); return undefined; }
    let script = document.querySelector('script[data-gsi]');
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset.gsi = '1';
      document.head.appendChild(script);
    }
    const onError = () => setAuthError('Gagal memuat layanan Google Sign-In. Periksa koneksi internet.');
    script.addEventListener('load', init);
    script.addEventListener('error', onError);
    return () => { script.removeEventListener('load', init); script.removeEventListener('error', onError); };
  }, [configured]);

  // Perbarui token diam-diam sebelum habis (±1 jam). Bila gagal, banner "Sambungkan kembali" muncul.
  useEffect(() => {
    if (phase !== 'ready' || !gsiReady || !tokenRef.current) return undefined;
    const ms = Math.max(tokenRef.current.expiresAt - Date.now() - REFRESH_MARGIN, 0);
    const timer = setTimeout(() => { getTokenRef.current({ forceRefresh: true }).catch(() => {}); }, ms);
    return () => clearTimeout(timer);
  }, [phase, gsiReady, tokenVersion]);

  const signIn = useCallback(async () => {
    setAuthError('');
    setPhase('working');
    setStep('auth');
    try {
      
      const resp = await requestToken({ prompt: 'select_account' });
      storeToken(resp);

      setStep('profile');
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${resp.access_token}` } });
      if (!res.ok) throw new ApiError('API', 'Gagal membaca profil akun Google.');
      const p = await res.json();
      const u = { sub: p.sub, email: p.email, name: p.name || p.email, picture: p.picture || '' };
      userRef.current = u;
      setUser(u);

      const ws = await ensureWorkspace({ cachedId: localStorage.getItem(sheetKey(u.sub)) || undefined, onStep: setStep });
      localStorage.setItem(sheetKey(u.sub), ws.spreadsheetId);
      localStorage.setItem(HINT_KEY, u.email);
      bindSpreadsheet(ws.spreadsheetId, u.email);
      workspaceRef.current = { spreadsheetId: ws.spreadsheetId, spreadsheetUrl: ws.spreadsheetUrl };
      setWorkspace(workspaceRef.current);
      persist();
      setNeedsReauth(false);
      setPhase('ready');
    } catch (e) {
      tokenRef.current = null;
      userRef.current = null;
      setUser(null);
      setWorkspace(null);
      setAuthError(messageFor(e));
      setPhase('signedOut');
    }
  }, [persist, requestToken, storeToken]);

  const reconnect = useCallback(async () => {
    const resp = await requestToken({ prompt: '', hint: userRef.current?.email });
    storeToken(resp);
    setNeedsReauth(false);
  }, [requestToken, storeToken]);

  const signOut = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    tokenRef.current = null;
    userRef.current = null;
    workspaceRef.current = null;
    bindSpreadsheet(null);
    setUser(null);
    setWorkspace(null);
    setNeedsReauth(false);
    setPhase('signedOut');
  }, []);

  const value = useMemo(() => ({
    configured, gsiReady, phase, step, user, workspace, authError, needsReauth, signIn, signOut, reconnect,
  }), [configured, gsiReady, phase, step, user, workspace, authError, needsReauth, signIn, signOut, reconnect]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
