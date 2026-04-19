import { useMj } from '@/stores/mj';
import { OVERLAYS } from '@/data/overlays';
import { cn } from '@/lib/utils';
import { CloudLightning, Eraser } from 'lucide-react';

interface Props {
  onChange: () => void;
}

export function OverlayPanel({ onChange }: Props) {
  const {
    activeOverlays,
    toggleOverlay,
    clearOverlays,
    stormMode,
    setStormMode,
    masterVolume,
    setMasterVolume,
  } = useMj();

  const toggle = (id: string) => {
    toggleOverlay(id);
    onChange();
  };

  const triggerStorm = () => {
    const next = !stormMode;
    setStormMode(next);
    if (next) {
      // Mimic legacy behavior: activate rain/thunder/wind/darkness.
      ['rain', 'thunder', 'wind', 'darkness'].forEach((id) => {
        if (!activeOverlays.has(id)) toggleOverlay(id);
      });
    }
    onChange();
  };

  const clear = () => {
    clearOverlays();
    onChange();
  };

  return (
    <div className="panel p-4 space-y-3">
      <div className="heading-rune text-sm">Effets & Overlays</div>
      <div className="grid grid-cols-3 gap-2">
        {OVERLAYS.map((o) => {
          const active = activeOverlays.has(o.id);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => toggle(o.id)}
              className={cn(
                'flex flex-col items-center gap-1 py-2 rounded-md border text-xs transition-colors',
                active
                  ? 'border-gold bg-gold/10 text-gold'
                  : 'border-border/60 text-parchment/70 hover:border-gold/60 hover:text-gold',
              )}
              title={o.kinds.join(' + ')}
            >
              <span className="text-lg">{o.emoji}</span>
              <span className="font-display uppercase tracking-wider">{o.label}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={triggerStorm}
        className={cn(
          'btn-rune w-full',
          stormMode && 'bg-blood/20 border-blood text-parchment shadow-[0_0_12px_rgba(139,0,0,0.5)]',
        )}
      >
        <CloudLightning className="w-4 h-4" />
        {stormMode ? 'Tempête ACTIVE' : 'Mode Tempête ++'}
      </button>
      <button type="button" onClick={clear} className="btn-rune w-full">
        <Eraser className="w-4 h-4" /> Effacer tous les effets
      </button>
      <div>
        <label className="flex items-center gap-2 text-xs uppercase tracking-wider text-parchment/70">
          🔊 Master
          <span className="ml-auto text-gold">{Math.round(masterVolume * 100)}%</span>
        </label>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(masterVolume * 100)}
          onChange={(e) => {
            setMasterVolume(Number(e.target.value) / 100);
            onChange();
          }}
          className="w-full accent-gold"
        />
      </div>
    </div>
  );
}
