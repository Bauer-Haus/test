// ─── MOCK TOGGLE ─────────────────────────────────────────────────────────────
// Set to true to read from local sample JSON files in /src/mocks/.
// Set to false to hit the real backend at VITE_API_URL.
const USE_MOCKS = true;

// ─── Mock imports (only used when USE_MOCKS=true) ────────────────────────────
import mockBrief     from './mocks/brief-today.json';
import mockRecovery  from './mocks/state-recovery.json';
import mockMacros    from './mocks/state-macros.json';
import mockTraining  from './mocks/training-split.json';
import mockCoachMeal from './mocks/coach-meal.json';

// Stubs for endpoints we don't have sample files for yet
const mockRotation = { today: '2026-04-30', state: 'REST_DAY',
  last_session: { date: '2026-04-29', day: 'A', note: 'Push + run.' },
  next_session: { day: 'B', title: 'Upper Pull + Run', scheduled_time: '10:00 AM',
    first_lift: { name: 'Single-arm seated cable row', top_working_weight_lb: 180 },
    total_working_sets: 19, duration_estimate_minutes: [55, 60] } };
const mockFasting = { in_window: false, phase: 'fasting',
  next_window_open: '2026-05-01T12:00:00-05:00', minutes_until_open: 810 };
const mockCalendar = { date: '2026-04-30', events: [
  { title: 'Workout: Day B (Pull + Run)', start: '2026-04-30T10:00:00-05:00',
    end: '2026-04-30T11:30:00-05:00', all_day: false, calendar: 'Personal',
    location: 'Lifetime Fitness' }] };
const mockWeight = { window: { start: '2026-04-01', end: '2026-04-30', days: 30 },
  points: [
    { date: '2026-04-01', weight_lb: 215.0 }, { date: '2026-04-08', weight_lb: 212.3 },
    { date: '2026-04-15', weight_lb: 209.4 }, { date: '2026-04-22', weight_lb: 207.1 },
    { date: '2026-04-29', weight_lb: 205.2 }, { date: '2026-04-30', weight_lb: 204.7 },
  ],
  summary: { earliest_lb: 215.0, latest_lb: 204.7, delta_lb: -10.3, rolling_7day_avg_lb: 205.8 } };

// ─── Real backend config ─────────────────────────────────────────────────────
const BASE = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8001';
const token = () => localStorage.getItem('fc_token') ?? '';
export const setToken = (t) => localStorage.setItem('fc_token', t);
const headers = () => ({ 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' });
const get  = (path)       => fetch(`${BASE}${path}`, { headers: headers() }).then(r => r.json());
const post = (path, body) => fetch(`${BASE}${path}`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(r => r.json());
const mock = (data, ms = 200) => new Promise(r => setTimeout(() => r(data), ms));

// ─── GETs ────────────────────────────────────────────────────────────────────
export const getBrief         = ()         => USE_MOCKS ? mock(mockBrief)    : get('/api/brief/today');
export const getRecovery      = ()         => USE_MOCKS ? mock(mockRecovery) : get('/api/state/recovery');
export const getMacros        = ()         => USE_MOCKS ? mock(mockMacros)   : get('/api/state/macros');
export const getRotation      = ()         => USE_MOCKS ? mock(mockRotation) : get('/api/state/rotation');
export const getFasting       = ()         => USE_MOCKS ? mock(mockFasting)  : get('/api/state/fasting');
export const getCalendar      = ()         => USE_MOCKS ? mock(mockCalendar) : get('/api/calendar/today');
export const getWeightTrend   = (days=30)  => USE_MOCKS ? mock(mockWeight)   : get(`/api/trend/weight?days=${days}`);
export const getSleepTrend    = (days=14)  => USE_MOCKS ? mock({})           : get(`/api/trend/sleep?days=${days}`);
export const getMacrosTrend   = (days=14)  => USE_MOCKS ? mock({})           : get(`/api/trend/macros?days=${days}`);
export const getTrainingSplit = ()         => USE_MOCKS ? mock(mockTraining) : get('/api/training/split');
export const getDietTemplates = ()         => USE_MOCKS ? mock({})           : get('/api/diet/templates');

// ─── POSTs ───────────────────────────────────────────────────────────────────
export const logDone      = (day, note, date) => USE_MOCKS ? mock({ status: 'logged', day }) : post('/api/log/done',       { day, note, date });
export const logWeight    = (weight_lb, date) => USE_MOCKS ? mock({ status: 'logged' })      : post('/api/log/weight',     { weight_lb, date });
export const logFastStart = (time, date)      => USE_MOCKS ? mock({ status: 'logged' })      : post('/api/log/fast/start', { time, date });
export const logFastEnd   = (time, date)      => USE_MOCKS ? mock({ status: 'logged' })      : post('/api/log/fast/end',   { time, date });

// ─── Streaming POSTs (SSE) ───────────────────────────────────────────────────
const mockStream = (text, onChunk, onDone) => {
  const words = text.split(' ');
  let i = 0;
  const id = setInterval(() => {
    if (i >= words.length) { clearInterval(id); onDone({ spoken_summary: text, done: true }); return; }
    onChunk(words[i] + ' '); i++;
  }, 40);
  return () => clearInterval(id);
};

const stream = (path, body, onChunk, onDone) => {
  const ctrl = new AbortController();
  fetch(`${BASE}${path}`, { method: 'POST', headers: headers(), body: JSON.stringify(body), signal: ctrl.signal })
    .then(async (res) => {
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

export const streamCoachNext = (onChunk, onDone) =>
  USE_MOCKS ? mockStream("Today is rest. Tomorrow is Day B at 10 AM. First lift is single-arm cable row at 180. After strength, get a 30-minute Peloton at Z2.", onChunk, onDone)
            : stream('/api/coach/next', {}, onChunk, onDone);

export const streamCoachMeal = (slot, hint, onChunk, onDone) =>
  USE_MOCKS ? mockStream(mockCoachMeal.spoken_summary, onChunk, onDone)
            : stream('/api/coach/meal', { slot, hint }, onChunk, onDone);

export const streamCoachMenu = (place, onChunk, onDone) =>
  USE_MOCKS ? mockStream(`At ${place}: chicken bowl with brown rice, black beans, fajita veggies. Around 550 calories, 40 grams of protein.`, onChunk, onDone)
            : stream('/api/coach/menu', { place }, onChunk, onDone);

export const streamSync = (sources, onChunk, onDone) =>
  USE_MOCKS ? mockStream("Sync complete.", onChunk, onDone)
            : stream('/api/sync', { sources }, onChunk, onDone);

export const streamRegenBrief = (onChunk, onDone) =>
  USE_MOCKS ? mockStream("Brief regenerated.", onChunk, onDone)
            : stream('/api/brief/regenerate', {}, onChunk, onDone);

export const subscribePush = (subscription) =>
  USE_MOCKS ? mock({ status: 'subscribed' }) : post('/api/push/subscribe', { subscription });
