import type { Phase } from './theme';

export interface Interruption {
  reason: string;
  at: number;
}

export interface SessionReview {
  taskCompleted: boolean;
  engagement: number; // 1-5 主观投入感
  outcome: string;
  notes: string;
}

export interface FlowSession {
  id: string;
  taskTitle: string;
  taskCategory: string;
  status: Phase;
  startedAt: number;
  endedAt: number | null;
  elapsedSeconds: number; // 有效专注时长（不含暂停）
  wallClockSeconds: number; // 实际经过时长（含暂停）
  interruptions: Interruption[];
  review: SessionReview | null;
}

const KEY = 'flow-space-sessions';

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function loadSessions(): FlowSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FlowSession[];
  } catch {
    return [];
  }
}

export function saveSession(s: FlowSession): void {
  if (typeof window === 'undefined') return;
  const list = loadSessions();
  const idx = list.findIndex((x) => x.id === s.id);
  if (idx >= 0) list[idx] = s;
  else list.unshift(s);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, 200)));
  } catch {
    /* 存储不可用时静默降级 */
  }
}

export function deleteSession(id: string): void {
  if (typeof window === 'undefined') return;
  const list = loadSessions().filter((x) => x.id !== id);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
