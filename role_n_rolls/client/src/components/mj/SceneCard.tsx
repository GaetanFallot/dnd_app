import { cn } from '@/lib/utils';
import type { Scene } from '@/data/scenes';
import { X, Pencil } from 'lucide-react';

interface Props {
  scene: Scene;
  active: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  onRename?: () => void;
}

export function SceneCard({ scene, active, onSelect, onDelete, onRename }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group relative overflow-hidden rounded-md border aspect-video',
        'transition-all text-left',
        active
          ? 'border-gold ring-2 ring-gold/40 shadow-[0_0_14px_rgba(201,168,76,0.5)]'
          : 'border-border/60 hover:border-gold/60',
      )}
    >
      <div
        className="absolute inset-0"
        style={{
          background: scene.src ? undefined : scene.bg,
          backgroundImage: scene.src ? `url(${scene.src})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      {scene.overlay && !scene.src && (
        <div className="absolute inset-0 pointer-events-none" style={{ background: scene.overlay }} />
      )}
      <div className="absolute top-2 left-2 text-2xl drop-shadow">{scene.emoji}</div>
      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
        <div className="font-display text-sm text-parchment truncate">{scene.name}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{scene.tag}</div>
      </div>
      {active && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gold text-night flex items-center justify-center text-xs font-bold">
          ✓
        </div>
      )}
      {(onDelete || onRename) && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onRename && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onRename();
              }}
              className="w-6 h-6 rounded-full bg-night/80 border border-gold/40 flex items-center justify-center text-gold hover:bg-gold hover:text-night cursor-pointer"
            >
              <Pencil className="w-3 h-3" />
            </span>
          )}
          {onDelete && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="w-6 h-6 rounded-full bg-night/80 border border-blood/40 flex items-center justify-center text-blood hover:bg-blood hover:text-parchment cursor-pointer"
            >
              <X className="w-3 h-3" />
            </span>
          )}
        </div>
      )}
    </button>
  );
}
