import { useCallback, useEffect, useRef, useState } from 'react';
import { useMj } from '@/stores/mj';
import { BUILT_IN_SOUNDS, getAudioContext, playBuiltIn } from '@/lib/helpers/soundboard';
import { useCustomSoundsDb, type CustomSound } from '@/hooks/useCustomSoundsDb';
import { useSecondScreenCtx } from '@/components/shared/SecondScreenProvider';
import { cn } from '@/lib/utils';
import { Plus, X, Play, Pause, Square, Repeat } from 'lucide-react';

const THUNDER_RX = /(thunder|tonnerre|orage|foudre|lightning)/i;

interface Playing {
  audio: HTMLAudioElement;
  loop: boolean;
}

export function Soundboard() {
  const { masterVolume } = useMj();
  const { sounds, addFromFile, remove } = useCustomSoundsDb();
  const { send, isOpen } = useSecondScreenCtx();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [rippling, setRippling] = useState<string | null>(null);

  const flashPopup = useCallback(
    (intensity = 0.9) => {
      if (!isOpen) return;
      send({ type: 'lightning-flash', intensity });
    },
    [send, isOpen],
  );

  // Blob URL cache so we don't re-create one per click.
  const [blobUrls, setBlobUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    const next: Record<string, string> = {};
    for (const s of sounds) {
      next[s.id] = URL.createObjectURL(s.blob);
    }
    setBlobUrls(next);
    return () => Object.values(next).forEach((u) => URL.revokeObjectURL(u));
  }, [sounds]);

  // Track which customs are currently playing/looping. Keyed by sound id
  // so the same sound can toggle play/pause without respawning <audio>.
  const playingRef = useRef<Map<string, Playing>>(new Map());
  const [playing, setPlaying] = useState<Record<string, { paused: boolean; loop: boolean }>>({});

  const syncState = () => {
    const snap: Record<string, { paused: boolean; loop: boolean }> = {};
    playingRef.current.forEach((p, id) => {
      snap[id] = { paused: p.audio.paused, loop: p.loop };
    });
    setPlaying(snap);
  };

  // Clean up on unmount so tracks don't keep playing after leaving MJ.
  useEffect(() => {
    const map = playingRef.current;
    return () => {
      map.forEach((p) => {
        try { p.audio.pause(); } catch { /* ignore */ }
      });
      map.clear();
    };
  }, []);

  // React to masterVolume changes.
  useEffect(() => {
    playingRef.current.forEach((p) => {
      p.audio.volume = Math.min(1, masterVolume * 1.5);
    });
  }, [masterVolume]);

  const ripple = (id: string) => {
    setRippling(id);
    window.setTimeout(() => setRippling((r) => (r === id ? null : r)), 280);
  };

  const playBuiltInHandler = useCallback(
    async (defId: string) => {
      const def = BUILT_IN_SOUNDS.find((s) => s.id === defId);
      if (!def) return;
      ripple(defId);
      getAudioContext();
      if (THUNDER_RX.test(def.id) || THUNDER_RX.test(def.label)) {
        // Kick the 2nd screen flash first so it reads as "lightning → boom".
        flashPopup(1);
      }
      await playBuiltIn(def, masterVolume);
    },
    [masterVolume, flashPopup],
  );

  const startCustom = useCallback(
    (s: CustomSound) => {
      ripple(s.id);
      if (THUNDER_RX.test(s.name)) flashPopup(0.8);
      const existing = playingRef.current.get(s.id);
      if (existing) {
        if (existing.audio.paused) void existing.audio.play().catch(() => {});
        else existing.audio.pause();
        syncState();
        return;
      }
      const url = blobUrls[s.id];
      if (!url) return;
      const audio = new Audio(url);
      audio.volume = Math.min(1, masterVolume * 1.5);
      audio.loop = false;
      audio.onended = () => {
        if (!audio.loop) {
          playingRef.current.delete(s.id);
          syncState();
        }
      };
      playingRef.current.set(s.id, { audio, loop: false });
      void audio.play().catch(() => {});
      syncState();
    },
    [blobUrls, masterVolume],
  );

  const stopCustom = (id: string) => {
    const entry = playingRef.current.get(id);
    if (!entry) return;
    try {
      entry.audio.pause();
      entry.audio.currentTime = 0;
    } catch { /* ignore */ }
    playingRef.current.delete(id);
    syncState();
  };

  const toggleLoop = (id: string) => {
    const entry = playingRef.current.get(id);
    if (!entry) return;
    entry.loop = !entry.loop;
    entry.audio.loop = entry.loop;
    syncState();
  };

  const onFiles = async (files: FileList) => {
    for (const f of Array.from(files)) {
      await addFromFile(f);
    }
  };

  return (
    <div className="panel p-4 space-y-3">
      <div className="heading-rune text-sm">🎲 Soundboard</div>
      <div className="grid grid-cols-3 gap-2">
        {BUILT_IN_SOUNDS.map((def) => (
          <button
            key={def.id}
            type="button"
            onClick={() => playBuiltInHandler(def.id)}
            className={cn(
              'relative overflow-hidden flex flex-col items-center gap-1 py-2 rounded-md border',
              'border-border/60 hover:border-gold hover:bg-gold/5 transition-colors text-xs',
              rippling === def.id && 'animate-glow-pulse',
            )}
          >
            <span className="text-xl">{def.emoji}</span>
            <span className="font-display uppercase tracking-wider text-parchment/80">{def.label}</span>
          </button>
        ))}
      </div>
      {sounds.length > 0 && (
        <ul className="space-y-1.5">
          {sounds.map((s) => {
            const state = playing[s.id];
            const isPlaying = !!state && !state.paused;
            return (
              <li
                key={s.id}
                className="flex items-stretch rounded-md border border-border/60 bg-night-deep/40 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => startCustom(s)}
                  className={cn(
                    'flex items-center gap-2 flex-1 px-2 py-1.5 text-xs truncate transition-colors',
                    isPlaying
                      ? 'text-gold bg-gold/10'
                      : 'text-parchment/80 hover:text-gold hover:bg-gold/5',
                    rippling === s.id && 'animate-glow-pulse',
                  )}
                  title={s.name}
                >
                  {isPlaying ? <Pause className="w-3 h-3 shrink-0" /> : <Play className="w-3 h-3 shrink-0" />}
                  <span className="truncate">{s.name}</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleLoop(s.id)}
                  disabled={!state}
                  className={cn(
                    'px-2 border-l border-border/60 transition-colors',
                    state?.loop
                      ? 'text-gold bg-gold/10'
                      : 'text-muted-foreground hover:text-gold disabled:opacity-40',
                  )}
                  title={state?.loop ? 'Boucle active' : 'Activer la boucle'}
                >
                  <Repeat className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => stopCustom(s.id)}
                  disabled={!state}
                  className="px-2 border-l border-border/60 text-muted-foreground hover:text-blood disabled:opacity-40 transition-colors"
                  title="Arrêter"
                >
                  <Square className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => { stopCustom(s.id); remove(s.id); }}
                  className="px-2 border-l border-border/60 text-muted-foreground hover:text-blood transition-colors"
                  title="Supprimer le son"
                >
                  <X className="w-3 h-3" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        className="btn-rune w-full text-xs"
      >
        <Plus className="w-3 h-3" /> Importer un son (wav, mp3…)
      </button>
      <input
        ref={fileInput}
        type="file"
        multiple
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void onFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
