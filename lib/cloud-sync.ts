'use client';

import { useEffect, useRef } from 'react';
import { useAppStore, serializeForCloud } from './store';

const DEBOUNCE_MS = 1500;

/**
 * Two-way cloud sync for the anonymous saveId:
 *  - On mount, loads the cloud save (if any) and applies it over local state.
 *  - After hydration, debounces store changes and pushes them to /api/save.
 *
 * Degrades silently when Supabase is not configured (routes return 503) — the
 * app keeps working from localStorage only.
 */
export function useCloudSync(): void {
  const hydratedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial load.
  useEffect(() => {
    let cancelled = false;
    const saveId = useAppStore.getState().saveId;
    (async () => {
      try {
        const res = await fetch(`/api/save?saveId=${encodeURIComponent(saveId)}`);
        if (res.ok) {
          const json = (await res.json()) as { found?: boolean; data?: unknown };
          if (!cancelled && json?.found && json.data) {
            useAppStore.getState().applyCloudData(json.data);
          }
        }
      } catch {
        // offline / not configured: keep local state.
      } finally {
        if (!cancelled) hydratedRef.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced push on change.
  useEffect(() => {
    const unsub = useAppStore.subscribe(() => {
      if (!hydratedRef.current) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const s = useAppStore.getState();
        fetch('/api/save', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ saveId: s.saveId, data: serializeForCloud(s) }),
        }).catch(() => {
          // ignore transient/offline failures; next change retries.
        });
      }, DEBOUNCE_MS);
    });
    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}
