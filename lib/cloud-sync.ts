'use client';

import { useEffect, useRef } from 'react';
import { useAppStore, serializeForCloud } from './store';

const DEBOUNCE_MS = 1500;

/** Cheap transcript fingerprint: length + last id. */
function messagesSignature(msgs: { id: string }[]): string {
  return `${msgs.length}:${msgs[msgs.length - 1]?.id ?? ''}`;
}

/**
 * Two-way cloud sync over the normalized /api/sync route (device_id = saveId):
 *  - On mount, pulls the snapshot (characters + active gameState) and applies it.
 *  - After hydration, debounces store changes and pushes them.
 *
 * The per-message replace is gated by a signature so routine ticks (affinity,
 * isGeneratingLook, look-url writes) push only character/look/game_state upserts.
 * Degrades silently when Supabase is not configured (503) — local-only operation.
 */
export function useCloudSync(): void {
  const hydratedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMsgSigRef = useRef<string | null>(null);

  // Initial load.
  useEffect(() => {
    let cancelled = false;
    const saveId = useAppStore.getState().saveId;
    (async () => {
      try {
        const res = await fetch(`/api/sync?saveId=${encodeURIComponent(saveId)}`);
        if (res.ok) {
          const json = (await res.json()) as {
            found?: boolean;
            data?: { gameState?: { messages?: { id: string }[] } };
          };
          if (!cancelled && json?.found && json.data) {
            useAppStore.getState().applyCloudData(json.data);
            // Seed the signature so we don't immediately re-push the loaded transcript.
            lastMsgSigRef.current = messagesSignature(json.data.gameState?.messages ?? []);
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
        const payload = serializeForCloud(s);
        const sig = messagesSignature(payload.messages ?? []);
        const sendMessages = sig !== lastMsgSigRef.current;
        const intent = s.pendingReset ? ('reset' as const) : undefined;
        fetch('/api/sync', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            messages: sendMessages ? payload.messages : null,
            intent,
          }),
        })
          .then((res) => {
            if (!res.ok) return;
            if (sendMessages) lastMsgSigRef.current = sig;
            // Clear the reset authorization ONLY after the wipe actually landed,
            // so a failed push keeps pendingReset set for the next retry.
            if (intent) s.clearPendingReset();
          })
          .catch(() => {
            // transient/offline: pendingReset stays set; next change retries.
          });
      }, DEBOUNCE_MS);
    });
    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}
