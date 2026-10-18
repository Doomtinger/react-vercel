'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { COLORS } from '@/components/flow-space/theme';
import { FlowSession, deleteSession, formatClock, formatDate, loadSessions } from '@/components/flow-space/session';

export default function FlowHistoryPage() {
  const [sessions, setSessions] = useState<FlowSession[]>([]);

  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  const remove = (id: string) => {
    deleteSession(id);
    setSessions(loadSessions());
  };

  return (
    <main
      className="min-h-screen w-full px-4 py-10 text-white"
      style={{ background: `radial-gradient(circle at 50% 0%, #111A2D 0%, ${COLORS.deepSpace} 60%)` }}
    >
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: COLORS.flowBlue, boxShadow: `0 0 12px ${COLORS.flowBlue}` }}
              />
              <span className="text-sm font-semibold tracking-[0.25em] text-white/90">FLOW SPACE</span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold">专注历史</h1>
            <p className="mt-1 text-xs text-white/50">回顾你进入心流空间的每一次投入。</p>
          </div>
          <Link
            href="/flow"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10"
          >
            返回主空间
          </Link>
        </header>

        {sessions.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-[#111A2D]/60 p-12 text-center">
            <div className="text-white/40">还没有专注记录</div>
            <Link
              href="/flow"
              className="mt-4 inline-block rounded-full px-6 py-2.5 text-sm font-medium text-[#070B14]"
              style={{ background: 'linear-gradient(135deg,#7894FF,#B39AFF)' }}
            >
              开始第一次专注
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="rounded-2xl border border-white/10 bg-[#111A2D]/60 p-4 transition hover:border-white/20"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/60">
                        {s.taskCategory}
                      </span>
                      <span className="truncate text-sm font-medium text-white/90">{s.taskTitle}</span>
                    </div>
                    <div className="mt-1 text-xs text-white/40">{formatDate(s.startedAt)}</div>
                  </div>
                  <button
                    onClick={() => remove(s.id)}
                    className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/50 transition hover:bg-white/10"
                  >
                    删除
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/60">
                  <span>
                    专注 <span className="font-mono text-white/90">{formatClock(s.elapsedSeconds)}</span>
                  </span>
                  <span>
                    实际 <span className="font-mono text-white/90">{formatClock(s.wallClockSeconds)}</span>
                  </span>
                  <span>中断 {s.interruptions.length} 次</span>
                  {s.review && (
                    <span>
                      投入感{' '}
                      <span className="text-white/90">
                        {'★'.repeat(s.review.engagement)}
                        <span className="text-white/25">{'★'.repeat(5 - s.review.engagement)}</span>
                      </span>
                    </span>
                  )}
                  {s.review && (
                    <span className={s.review.taskCompleted ? 'text-[#7894FF]' : 'text-white/40'}>
                      {s.review.taskCompleted ? '已完成' : '未完成'}
                    </span>
                  )}
                </div>

                {s.review?.outcome && (
                  <p className="mt-2 line-clamp-2 text-xs text-white/45">{s.review.outcome}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
