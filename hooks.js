/**
 * fitness-dashboard / api/hooks.js
 *
 * One hook per logical endpoint group. Each hook returns:
 *   { data, loading, error, refetch? }
 *
 * Coach hooks also return { streaming, text, run }
 * where run(body) fires the SSE request.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch, apiStream, ApiError } from './client';

// ─── Generic data hook ───────────────────────────────────────────────────────
function useApiData(path, deps = []) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(path);
      setData(res);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => { refetch(); }, [refetch, ...deps]);

  return { data, loading, error, refetch };
}

// ─── Brief ───────────────────────────────────────────────────────────────────
/** Returns today's brief from cache (~1s). */
export function useBrief() {
  return useApiData('/api/brief/today');
}

// ─── State ───────────────────────────────────────────────────────────────────
export function useRecovery() { return useApiData('/api/state/recovery'); }
export function useMacros()   { return useApiData('/api/state/macros'); }
export function useRotation() { return useApiData('/api/state/rotation'); }
export function useFasting()  { return useApiData('/api/state/fasting'); }
export function useCalendar() { return useApiData('/api/calendar/today'); }

// ─── Trends ──────────────────────────────────────────────────────────────────
export function useWeightTrend(days = 30) {
  return useApiData(`/api/trend/weight?days=${days}`, [days]);
}
export function useSleepTrend(days = 14) {
  return useApiData(`/api/trend/sleep?days=${days}`, [days]);
}
export function useMacrosTrend(days = 14) {
  return useApiData(`/api/trend/macros?days=${days}`, [days]);
}

// ─── Training & diet ─────────────────────────────────────────────────────────
export function useTrainingSplit()  { return useApiData('/api/training/split'); }
export function useDietTemplates()  { return useApiData('/api/diet/templates'); }

// ─── Log actions (fire-and-forget mutations) ─────────────────────────────────
/** Log a completed rotation day.
 *  usage: const { logDone, loading, result } = useLogDone()
 *         await logDone({ day: 'B', note: '...' })
 */
export function useLogDone() {
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);

  const logDone = useCallback(async ({ day, note, date } = {}) => {
    setLoading(true); setError(null);
    try {
      const res = await apiFetch('/api/log/done', {
        method: 'POST',
        body: JSON.stringify({ day, note, date }),
      });
      setResult(res);
      return res;
    } catch (e) { setError(e); throw e; }
    finally { setLoading(false); }
  }, []);

  return { logDone, loading, result, error };
}

/** Log a manual weight. */
export function useLogWeight() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const logWeight = useCallback(async ({ weight_lb, date } = {}) => {
    setLoading(true); setError(null);
    try {
      return await apiFetch('/api/log/weight', {
        method: 'POST',
        body: JSON.stringify({ weight_lb, date }),
      });
    } catch (e) { setError(e); throw e; }
    finally { setLoading(false); }
  }, []);

  return { logWeight, loading, error };
}

/** Stamp fast start or end.
 *  type: 'start' | 'end'
 */
export function useLogFast() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const logFast = useCallback(async ({ type, time, date } = {}) => {
    setLoading(true); setError(null);
    const path = type === 'start' ? '/api/log/fast/start' : '/api/log/fast/end';
    try {
      return await apiFetch(path, {
        method: 'POST',
        body: JSON.stringify({ time, date }),
      });
    } catch (e) { setError(e); throw e; }
    finally { setLoading(false); }
  }, []);

  return { logFast, loading, error };
}

// ─── Sync (SSE) ───────────────────────────────────────────────────────────────
/**
 * usage:
 *   const { sync, syncing, result, error } = useSync();
 *   sync({ sources: ['garmin', 'mfp'] });
 */
export function useSync() {
  const [syncing, setSyncing] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);
  const abortRef = useRef(null);

  const sync = useCallback(({ sources = ['garmin', 'mfp'] } = {}) => {
    setSyncing(true); setError(null); setResult(null);
    abortRef.current = apiStream(
      '/api/sync',
      { sources },
      () => {}, // no partial chunks for sync — just status events
      (done) => { setResult(done); setSyncing(false); },
      (err)  => { setError(err);   setSyncing(false); },
    );
  }, []);

  useEffect(() => () => abortRef.current?.(), []);
  return { sync, syncing, result, error };
}

// ─── Coach (SSE streaming) ────────────────────────────────────────────────────
/**
 * Generic SSE coach hook. Returns streaming partial text + final payload.
 *
 * usage:
 *   const { ask, streaming, text, response, error } = useCoach('/api/coach/next');
 *   ask({});   // fires the request
 *
 * For /api/coach/meal pass { slot: 'lunch', hint: '...' }
 * For /api/coach/menu pass { place: 'Chipotle' }
 */
export function useCoach(path) {
  const [streaming, setStreaming] = useState(false);
  const [text,      setText]      = useState('');
  const [response,  setResponse]  = useState(null);
  const [error,     setError]     = useState(null);
  const abortRef = useRef(null);

  const ask = useCallback((body = {}) => {
    abortRef.current?.(); // cancel any in-flight request
    setText(''); setResponse(null); setError(null); setStreaming(true);

    abortRef.current = apiStream(
      path,
      body,
      (delta) => setText(prev => prev + delta),
      (done)  => { setResponse(done); setStreaming(false); },
      (err)   => { setError(err);     setStreaming(false); },
    );
  }, [path]);

  const cancel = useCallback(() => {
    abortRef.current?.();
    setStreaming(false);
  }, []);

  useEffect(() => () => abortRef.current?.(), []);
  return { ask, cancel, streaming, text, response, error };
}

// Convenience named exports for each coach endpoint
export const useCoachNext      = () => useCoach('/api/coach/next');
export const useCoachMeal      = () => useCoach('/api/coach/meal');
export const useCoachMenu      = () => useCoach('/api/coach/menu');
export const useBriefRegenerate = () => useCoach('/api/brief/regenerate');
