const BASE = import.meta.env.VITE_API_URL ?? 'https://fitness.shiloenterprises.com/api';

const token = () => localStorage.getItem('fc_token') ?? '';
export const setToken = (t) => localStorage.setItem('fc_token', t);

const headers = () => ({
  'Authorization': `Bearer ${token()}`,
  'Content-Type': 'application/json',
});

const get  = (path)       => fetch(`${BASE}${path}`, { headers: headers() }).then(r => r.json());
const post = (path, body) => fetch(`${BASE}${path}`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(r => r.json());

// ─── GETs ────────────────────────────────────────────────────────────────────
export const getBrief       = ()           => get('/api/brief/today');
export const getRecovery    = ()           => get('/api/state/recovery');
export const getMacros      = ()           => get('/api/state/macros');
export const getRotation    = ()           => get('/api/state/rotation');
export const getFasting     = ()           => get('/api/state/fasting');
export const getCalendar    = ()           => get('/api/calendar/today');
export const getWeightTrend = (days = 30) => get(`/api/trend/weight?days=${days}`);
export const getSleepTrend  = (days = 14) => get(`/api/trend/sleep?days=${days}`);
export const getMacrosTrend = (days = 14) => get(`/api/trend/macros?days=${days}`);
export const getTrainingSplit  = ()        => get('/api/training/split');
export const getDietTemplates  = ()        => get('/api/diet/templates');
export const getHealth  = ()        => get('/api/health');
export const getSettings  = ()        => get('/api/settings');
export const getServer  = ()        => get('/api/events/stream');
export const getJob  = ()        => get('/api/jobs/<id>');

// ─── POSTs ───────────────────────────────────────────────────────────────────
export const logDone        = (day, note, date)  => post('/api/log/done',       { day, note, date });
export const logWeight      = (weight_lb, date)  => post('/api/log/weight',     { weight_lb, date });
export const logFastStart   = (time, date)       => post('/api/log/fast/start', { time, date });
export const logFastEnd     = (time, date)       => post('/api/log/fast/end',   { time, date });
 
// ─── POSTs with streaming (SSE) ──────────────────────────────────────────────
// onChunk(deltaText) fires as text streams in
// onDone(finalPayload) fires when complete
// returns a cancel() function
const stream = (path, body, onChunk, onDone) => {
  const ctrl = new AbortController();
  fetch(`${BASE}${path}`, {
    method: 'POST', headers: headers(),
    body: JSON.stringify(body), signal: ctrl.signal,
  }).then(async (res) => {
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      for (const line of buf.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        try {
          const msg = JSON.parse(line.slice(6));
          if (msg.delta) onChunk(msg.delta);
          if (msg.done)  onDone(msg);
        } catch {}
      }
      buf = buf.includes('\n') ? buf.split('\n').pop() : buf;
    }
  }).catch(() => {});
  return () => ctrl.abort();
};
 
export const streamCoachNext = (onChunk, onDone)              => stream('/api/coach/next',       {},             onChunk, onDone);
export const streamCoachMeal = (slot, hint, onChunk, onDone)  => stream('/api/coach/meal',       { slot, hint }, onChunk, onDone);
export const streamCoachMenu = (place, onChunk, onDone)       => stream('/api/coach/menu',       { place },      onChunk, onDone);
export const streamSync      = (sources, onChunk, onDone)     => stream('/api/sync',             { sources },    onChunk, onDone);
export const streamRegenBrief= (onChunk, onDone)              => stream('/api/brief/regenerate', {},             onChunk, onDone);
 
export const subscribePush   = (subscription)                 => post('/api/push/subscribe',     { subscription });
 
