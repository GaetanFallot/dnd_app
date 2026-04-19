import { useCallback, useEffect, useRef, useState } from 'react';
import { useMj } from '@/stores/mj';
import { BUILT_IN_SOUNDS, getAudioContext, playBuiltIn } from '@/lib/helpers/soundboard';
import { useCustomSoundsDb, type CustomSound } from '@/hooks/useCustomSoundsDb';
import { cn } from '@/lib/utils';
import { Plus, X } from 'lucide-react';

export function Soundboard() {
  const { masterVolume } = useMj();
  const { sounds, addFromFile, remove } = useCustomSoundsDb();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [rippling, setRippling] = useState<string | null>(null);

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

  const ripple = (id: string) => {
    setRippling(id);
    window.setTimeout(() => setRippling((r) => (r === id ? null : r)), 280);
  };

  const playBuiltInHandler = useCallback(
    async (defId: string) => {
      const def = BUILT_IN_SOUNDS.find((s) => s.id === defId);
      if (!def) return;
      ripple(defId);
      getAudioContext(); // unlock
      await playBuiltIn(def, masterVolume);
    },
    [masterVolume],
  );

  const playCustom = useCallback(
    (s: CustomSound) => {
      ripple(s.id);
      const url = blobUrls[s.id];
      if (!url) return;
      const audio = new Audio(url);
      audio.volume = Math.min(1, masterVolume * 1.5);
      void audio.play().catch(() => {});
    },
    [blobUrls, masterVolume],
  );

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
        <div className="grid grid-cols-2 gap-1.5">
          {sounds.map((s) => (
            <div key={s.id} className="relative flex items-stretch">
              <button
                type="button"
                onClick={() => playCustom(s)}
                className={cn(
                  'flex-1 px-2 py-1.5 rounded-l-md border border-r-0 border-border/60 text-xs truncate',
                  'text-parchment/80 hover:border-gold hover:text-gold hover:bg-gold/5 transition-colors',
                  rippling === s.id && 'animate-glow-pulse',
                )}
                title={s.name}
              >
                {s.name.slice(0, 18)}
              </button>
              <button
                type="button"
                onClick={() => remove(s.id)}
                className="px-1.5 rounded-r-md border border-border/60 text-muted-foreground hover:border-blood hover:text-blood transition-colors"
                title="Supprimer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
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
