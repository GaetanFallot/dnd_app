import { useMj, type FitMode } from '@/stores/mj';
import { cn } from '@/lib/utils';
import { Monitor, Maximize, CircleOff } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onToggle: () => void;
  onFullscreen: () => void;
  onBlack: () => void;
  onFitChange: (fit: FitMode) => void;
}

const fits: Array<{ id: FitMode; label: string }> = [
  { id: 'contain', label: '⬜ Contenir' },
  { id: 'cover', label: '⬛ Remplir' },
  { id: 'stretch', label: '↔ Étirer' },
  { id: 'center', label: '· Centrer' },
];

export function SecondScreenPanel({ isOpen, onToggle, onFullscreen, onBlack, onFitChange }: Props) {
  const { fit } = useMj();

  return (
    <div className="panel p-4 space-y-3">
      <div className="heading-rune text-sm">Écran secondaire</div>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'btn-rune w-full justify-start',
          isOpen && 'bg-gold/15 border-gold text-gold shadow-[0_0_12px_rgba(201,168,76,0.3)]',
        )}
      >
        <span
          className={cn(
            'w-2 h-2 rounded-full',
            isOpen ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-muted-foreground',
          )}
        />
        <Monitor className="w-4 h-4" />
        {isOpen ? 'Fermer l\'écran 2' : 'Ouvrir l\'écran 2'}
      </button>
      <p className="text-[11px] text-muted-foreground leading-snug">
        Glisse la fenêtre sur ton 2<sup>e</sup> écran, appuie sur F11 pour le plein écran.
        Clique ensuite une scène pour l'afficher.
      </p>
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Affichage</div>
        <div className="grid grid-cols-2 gap-1.5">
          {fits.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onFitChange(f.id)}
              className={cn(
                'px-2 py-1.5 rounded-md border text-xs font-display uppercase tracking-wider transition-colors',
                fit === f.id
                  ? 'border-gold bg-gold/10 text-gold'
                  : 'border-border/60 text-parchment/70 hover:border-gold/60 hover:text-gold',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onFullscreen} className="btn-rune flex-1 text-xs">
          <Maximize className="w-3 h-3" /> Plein écran
        </button>
        <button type="button" onClick={onBlack} className="btn-blood flex-1 text-xs">
          <CircleOff className="w-3 h-3" /> Noir
        </button>
      </div>
    </div>
  );
}
