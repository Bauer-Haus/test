/**
 * fitness-dashboard / api/client.js
 *
 * Auth:    Bearer token stored in localStorage under 'fc_token'
 * Base URL: set FC_API_URL in .env (defaults to localhost:8001 for local dev)
 *
 * Two helpers exported:
 *   apiFetch(path, options?)  → standard JSON endpoints
 *   apiStream(path, body, onChunk, onDone, onError)  → SSE for coach / regenerate / sync
 */

const BASE = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8001';

// ─── Token helpers ───────────────────────────────────────────────────────────
export const getToken = () => localStorage.getItem('fc_token') ?? '';
export const setToken = (t) => localStorage.setItem('fc_token', t);
export const clearToken = () => localStorage.removeItem('fc_token');

function authHeaders(extra = {}) {
  return {
    'Authorization': `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

// ─── Standard JSON fetch ─────────────────────────────────────────────────────
/**
 * @param {string} path  e.g. '/api/state/recovery'
 * @param {RequestInit} [opts]
 * @returns {Promise<any>}
 * @throws {ApiError}
 */
export async function apiFetch(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: authHeaders(opts.headers ?? {}),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail ?? res.statusText, body);
  }

  return res.json();
}

// ─── SSE streaming fetch ─────────────────────────────────────────────────────
/**
 * For endpoints that stream Server-Sent Events (coach, brief/regenerate, sync).
 * The server should emit:
 *   data: {"delta": "…partial text…"}
 *   data: {"done": true, "full": "…complete text…", "latency_ms": 4127}
 *   data: {"error": "…message…"}
 *
 * @param {string} path
 * @param {object} body          POST body
 * @param {(delta: string) => void} onChunk   called with each text fragment
 * @param {(full: object) => void}  onDone    called with the final payload
 * @param {(err: ApiError) => void} onError
 * @returns {() => void}  call to abort the stream
 */
export function apiStream(path, body, onChunk, onDone, onError) {
  const ctrl = new AbortController();

  (async () => {
    let res;
    try {
      res = await fetch(`${BASE}${path}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
    } catch (e) {
      if (e.name !== 'AbortError') onError(new ApiError(0, e.message));
      return;
    }

    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      onError(new ApiError(res.status, b.detail ?? res.statusText, b));
      return;
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop(); // keep incomplete last line

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const json = line.slice(6).trim();
        if (json === '[DONE]') continue;
        try {
          const msg = JSON.parse(json);
          if (msg.error)  { onError(new ApiError(500, msg.error)); return; }
          if (msg.done)   { onDone(msg); return; }
          if (msg.delta)  { onChunk(msg.delta); }
        } catch { /* malformed line, skip */ }
      }
    }
  })();

  return () => ctrl.abort();
}

// ─── Error class ─────────────────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(status, message, body = {}) {
    super(message);
    this.status = status;
    this.body = body;
    // Surface the MFP-cookie error so the UI can show the specific warning
    this.isMfpAuthError = status === 401 && (body.source === 'mfp' || message.includes('MFP'));
  }
}
