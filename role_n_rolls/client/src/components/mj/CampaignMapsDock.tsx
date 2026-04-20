import { useState } from 'react';
import { useSession } from '@/stores/session';
import { useMaps, type MapRow } from '@/hooks/useMaps';
import { useSecondScreenCtx } from '@/components/shared/SecondScreenProvider';
import { Map as MapIcon, ChevronDown, ChevronRight, Loader2, X, Cast } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Dock in the MJ left column that surfaces the active campaign's maps.
 * Click a thumbnail → opens a viewer modal; "Cast" button pushes the map
 * to the second screen (as a scene background).
 */
export function CampaignMapsDock() {
  const { activeCampaignId } = useSession();
  const maps = useMaps(activeCampaignId ?? undefined);
  const { sendScene } = useSecondScreenCtx();
  const [open, setOpen] = useState(true);
  const [viewing, setViewing] = useState<MapRow | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1500);
  };

  const rows = maps.data ?? [];

  const castToSecond = (m: MapRow) => {
    sendScene(
      {
        id: `map:${m.id}`,
        name: m.title,
        tag: 'Carte',
        bg: '#000',
        emoji: '🗺️',
        src: m.image_url,
        isVideo: false,
      },
      'contain',
    );
    flash(`🗺️ "${m.title}" envoyé sur l'écran 2`);
  };

  return (
    <div className="panel p-3 space-y-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 heading-rune text-sm"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <MapIcon className="w-4 h-4" />
        Cartes
        {rows.length > 0 && (
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-gold/15 text-gold">
            {rows.length}
          </span>
        )}
      </button>

      {open && (
        <>
          {!activeCampaignId ? (
            <p className="text-xs italic text-muted-foreground">Aucune campagne active.</p>
          ) : maps.isLoading ? (
            <div className="py-3 text-center">
              <Loader2 className="w-4 h-4 animate-spin text-gold mx-auto" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-xs italic text-muted-foreground">
              Aucune carte dans cette campagne.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {rows.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-2 rounded bg-night-deep/40 border border-border/40 hover:border-gold/40 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setViewing(m)}
                    className="flex-1 flex items-center gap-2 px-2 py-1.5 text-left min-w-0"
                  >
                    <div
                      className="w-8 h-8 rounded bg-cover bg-center shrink-0 border border-border/40"
                      style={{ backgroundImage: `url(${m.image_url})` }}
                    />
                    <span className="text-xs font-display text-parchment truncate">{m.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => castToSecond(m)}
                    className="p-1.5 text-gold/70 hover:text-gold"
                    title="Envoyer sur l'écran 2"
                  >
                    <Cast className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {viewing && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setViewing(null)}
        >
          <div
            className="relative max-w-6xl max-h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center gap-2 mb-2">
              <h2 className="heading-rune text-lg flex-1">{viewing.title}</h2>
              <button
                type="button"
                onClick={() => castToSecond(viewing)}
                className="btn-rune text-xs"
              >
                <Cast className="w-3 h-3" /> Écran 2
              </button>
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="text-parchment/70 hover:text-gold"
              >
                <X className="w-5 h-5" />
              </button>
            </header>
            <img
              src={viewing.image_url}
              alt={viewing.title}
              className="max-w-full max-h-[85vh] object-contain rounded shadow-[0_0_40px_rgba(0,0,0,0.6)]"
            />
          </div>
        </div>
      )}

      {toast && (
        <div
          className={cn(
            'fixed bottom-6 left-1/2 -translate-x-1/2 z-[60]',
            'panel px-4 py-2 font-display uppercase tracking-wider text-sm animate-fade-in border-gold/60',
          )}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
