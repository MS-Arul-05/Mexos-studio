/**
 * API client for the Mexos Studio backend.
 *
 * The backend wraps every response in `{ success, data, message? }` /
 * `{ success: false, error: { code, message } }` — this client unwraps the
 * envelope, manages the JWT access + refresh token pair in localStorage, and
 * retries exactly once after a 401 by rotating the refresh token.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const REFRESH_KEY = 'mxs_refresh';

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const isBrowser = globalThis.window !== undefined;

/**
 * Token store: access token is kept in memory only (not localStorage) to limit
 * XSS exposure — a stolen refresh token alone requires a round-trip and is
 * single-use with rotation. Only the refresh token is persisted for tab reload.
 */
let _accessToken: string | null = null;

export const tokenStore = {
  get access() {
    return _accessToken;
  },
  get refresh() {
    return isBrowser ? localStorage.getItem(REFRESH_KEY) : null;
  },
  set(access: string, refresh: string) {
    _accessToken = access;
    if (isBrowser) localStorage.setItem(REFRESH_KEY, refresh);
    globalThis.dispatchEvent(new Event('mxs-auth-changed'));
  },
  clear() {
    _accessToken = null;
    if (isBrowser) localStorage.removeItem(REFRESH_KEY);
    globalThis.dispatchEvent(new Event('mxs-auth-changed'));
  },
  get isLoggedIn() {
    return !!_accessToken || !!this.refresh;
  },
};

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  headers?: Record<string, string>;
}

async function rawRequest<T>(path: string, opts: RequestOptions): Promise<T> {
  const headers: Record<string, string> = { ...opts.headers };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.auth && tokenStore.access) headers.Authorization = `Bearer ${tokenStore.access}`;

  const res = await fetch(`${BASE}${path}`, {
    method: opts.method || 'GET',
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });

  let payload: { success?: boolean; data?: T; error?: { code?: string; message?: string } } = {};
  try {
    payload = await res.json();
  } catch {
    /* non-JSON error body */
  }

  if (payload.success === false || !res.ok) {
    throw new ApiError(
      payload.error?.code || 'REQUEST_FAILED',
      payload.error?.message || `Request failed (${res.status})`,
      res.status,
    );
  }
  return payload.data as T;
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = tokenStore.refresh;
  if (!refreshToken) return false;
  try {
    const data = await rawRequest<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    });
    tokenStore.set(data.accessToken, data.refreshToken);
    return true;
  } catch {
    tokenStore.clear();
    return false;
  }
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  // If we have a refresh token but no access token (e.g. after page reload),
  // proactively refresh before making the authenticated request.
  if (opts.auth && !tokenStore.access && tokenStore.refresh) {
    await tryRefresh();
  }
  try {
    return await rawRequest<T>(path, opts);
  } catch (e) {
    // Expired access token → rotate the refresh token and retry once.
    if (e instanceof ApiError && e.status === 401 && opts.auth && (await tryRefresh())) {
      return rawRequest<T>(path, opts);
    }
    throw e;
  }
}

export const api = {
  get: <T>(path: string, opts: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, opts),
  post: <T>(path: string, body?: unknown, opts: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, opts: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),
  del: <T>(path: string, opts: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...opts, method: 'DELETE' }),
};

/** Convert a 10-digit Indian mobile to the E.164 format the backend requires. */
export const toE164 = (tenDigits: string) => `+91${tenDigits.replace(/\D/g, '').slice(-10)}`;

// ── Auth flows ──
export interface Profile {
  id: string;
  mobileNumber: string;
  name: string | null;
  createdAt: string;
  addresses: {
    id: string;
    label: string | null;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    pincode: string;
    isDefault: boolean;
  }[];
}

export const auth = {
  sendOtp: (mobileNumber: string) => api.post('/auth/otp/send', { mobileNumber }),
  /** Verify the OTP, store tokens, and return the profile (name may be null for new users). */
  async verifyOtp(mobileNumber: string, otp: string): Promise<Profile> {
    const data = await api.post<{ accessToken: string; refreshToken: string; isNewUser: boolean }>(
      '/auth/otp/verify',
      { mobileNumber, otp },
    );
    tokenStore.set(data.accessToken, data.refreshToken);
    return api.get<Profile>('/account/me', { auth: true });
  },
  me: () => api.get<Profile>('/account/me', { auth: true }),
  setName: (name: string) => api.patch<{ name: string }>('/account/me', { name }, { auth: true }),
  async logout() {
    const refreshToken = tokenStore.refresh;
    if (refreshToken) await api.post('/auth/logout', { refreshToken }).catch(() => undefined);
    tokenStore.clear();
  },
};
