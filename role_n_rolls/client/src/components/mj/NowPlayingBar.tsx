import type { Scene } from '@/data/scenes';

interface Props {
  scene: Scene | null;
}

export function NowPlayingBar({ scene }: Props) {
  return (
    <div className="panel-accent p-3 flex items-center gap-4">
      <div
        className="w-20 h-12 rounded border border-border/60 overflow-hidden flex items-center justify-center text-xl"
        style={{
          background: scene?.src ? undefined : (scene?.bg ?? '#000'),
          backgroundImage: scene?.src ? `url(${scene.src})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {!scene?.src && (scene?.emoji ?? '—')}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Affiché sur l'écran 2
        </div>
        <div className={scene ? 'font-display text-gold text-lg truncate' : 'italic text-muted-foreground'}>
          {scene?.name ?? 'Aucune scène sélectionnée'}
        </div>
      </div>
    </div>
  );
}
