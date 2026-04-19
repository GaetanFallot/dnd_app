import { useCallback, useEffect, useRef, useState } from 'react';
import { buildSecondScreenHtml } from '@/lib/helpers/secondScreenHtml';
import { loadThunderSounds } from '@/lib/helpers/loadThunderSounds';
import type { Scene } from '@/data/scenes';
import type { Combatant } from '@/stores/mj';

export type SecondScreenMessage =
  | { type: 'scene'; src: string | null; bg: string; fit: string; isVideo: boolean }
  | { type: 'fit'; fit: string }
  | { type: 'black' }
  | { type: 'fullscreen' }
  | { type: 'overlays'; overlays: string[] }
  | { type: 'master-volume'; volume: number }
  | { type: 'effect-volume'; id: string; volume: number }
  | { type: 'storm-mode'; active: boolean }
  | {
      type: 'turn-order';
      visible: boolean;
      combatants?: Array<{ name: string; init: number }>;
      currentIdx?: number;
      round?: number;
    }
  | { type: 'vid-audio'; muted: boolean; volume: number }
  | { type: 'thunder-sounds'; sounds: Record<string, string> };

/**
 * Opens/closes a popup window and exposes a `send(msg)` that forwards
 * any `SecondScreenMessage`. Polls the window every 800 ms to detect
 * the user closing it manually.
 */
export function useSecondScreen() {
  const winRef = useRef<Window | null>(null);
  const urlRef = useRef<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const send = useCallback((msg: SecondScreenMessage) => {
    const w = winRef.current;
    if (!w || w.closed) return;
    w.postMessage(msg, '*');
  }, []);

  const close = useCallback(() => {
    if (winRef.current && !winRef.current.closed) winRef.current.close();
    winRef.current = null;
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setIsOpen(false);
  }, []);

  const open = useCallback(() => {
    if (winRef.current && !winRef.current.closed) {
      winRef.current.focus();
      return winRef.current;
    }
    const blob = new Blob([buildSecondScreenHtml()], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    urlRef.current = url;
    const w = window.open(
      url,
      'RnRScreen',
      'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no',
    );
    if (!w) {
      URL.revokeObjectURL(url);
      urlRef.current = null;
      return null;
    }
    winRef.current = w;
    setIsOpen(true);
    // Pre-load real thunder buffers and forward them once the popup is live.
    loadThunderSounds()
      .then((sounds) => {
        const target = winRef.current;
        if (target && !target.closed) target.postMessage({ type: 'thunder-sounds', sounds }, '*');
      })
      .catch((err) => console.warn('[thunder] load failed, falling back to synth', err));
    return w;
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const t = setInterval(() => {
      if (winRef.current?.closed) {
        winRef.current = null;
        if (urlRef.current) {
          URL.revokeObjectURL(urlRef.current);
          urlRef.current = null;
        }
        setIsOpen(false);
      }
    }, 800);
    return () => clearInterval(t);
  }, [isOpen]);

  useEffect(() => () => close(), [close]);

  // Convenience helpers
  const sendScene = useCallback(
    (scene: Scene | null, fit: string) => {
      if (!scene) {
        send({ type: 'scene', src: null, bg: '#000', fit, isVideo: false });
        return;
      }
      send({
        type: 'scene',
        src: scene.src ?? null,
        bg: scene.bg ?? '#000',
        fit,
        isVideo: !!scene.isVideo,
      });
    },
    [send],
  );

  const sendOverlays = useCallback(
    (overlays: Iterable<string>) => {
      send({ type: 'overlays', overlays: Array.from(overlays) });
    },
    [send],
  );

  const sendTurnOrder = useCallback(
    (
      visible: boolean,
      combatants: Combatant[],
      currentIdx: number,
      round: number,
    ) => {
      send({
        type: 'turn-order',
        visible,
        combatants: combatants.map((c) => ({ name: c.name, init: c.initiative })),
        currentIdx,
        round,
      });
    },
    [send],
  );

  return { isOpen, open, close, send, sendScene, sendOverlays, sendTurnOrder };
}
