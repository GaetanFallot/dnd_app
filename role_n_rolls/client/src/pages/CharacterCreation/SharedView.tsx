import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { decodeCharacter } from '@/lib/helpers/characterShare';
import { useImportCharacter } from '@/hooks/useCharacters';
import { useAuth } from '@/stores/auth';
import {
  CombatPanel,
  DeathSavesPanel,
  EquipmentPanel,
  FeaturesPanel,
  IdentityPanel,
  PersonalityPanel,
  SkillsPanel,
  SpellsPanel,
  WealthPanel,
} from './panels';
import type { DnDCharacter } from '@/types/character';

/**
 * Read-only viewer for shared character links (#/character/shared/:encoded).
 * The `patch` noop means writes silently drop — identical UX to the legacy
 * view.html but within the single React app.
 */
export function SharedView() {
  const { encoded } = useParams<{ encoded: string }>();
  const nav = useNavigate();
  const importM = useImportCharacter();
  const session = useAuth((s) => s.session);

  const ch = useMemo<DnDCharacter | null>(() => {
    if (!encoded) return null;
    try {
      return decodeCharacter(encoded);
    } catch (err) {
      console.warn('[shared] decode failed', err);
      return null;
    }
  }, [encoded]);

  if (!ch) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="panel p-8 text-center">
          <h1 className="heading-rune text-2xl mb-2">Lien invalide</h1>
          <p className="text-muted-foreground italic">
            Le personnage partagé n'a pas pu être décodé.
          </p>
        </div>
      </div>
    );
  }

  const noop = () => {};

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-night/95 backdrop-blur border-b border-border/60 px-4 py-3 flex items-center gap-3 flex-wrap">
        <h1 className="heading-rune text-xl flex-1 truncate">
          {ch._classIcon} {ch.char_name}
          <span className="text-muted-foreground ml-2 text-xs font-normal normal-case">
            {ch._className || '—'} · Niv. {ch.level}
          </span>
          <span className="ml-3 text-xs text-gold/70 font-body italic normal-case">lecture seule</span>
        </h1>
        <button
          type="button"
          disabled={importM.isPending}
          onClick={async () => {
            if (!session) {
              nav(`/auth?next=${encodeURIComponent(window.location.pathname)}`);
              return;
            }
            try {
              const rec = await importM.mutateAsync(ch);
              nav(`/character/${rec.id}`);
            } catch (err) {
              alert('Import impossible : ' + (err instanceof Error ? err.message : String(err)));
            }
          }}
          className="btn-rune text-xs disabled:opacity-60"
        >
          {session ? 'Importer chez moi' : 'Se connecter pour importer'}
        </button>
      </header>

      <div className="grid gap-4 p-4 xl:grid-cols-3 lg:grid-cols-2 pointer-events-none select-text">
        <div className="space-y-4 xl:col-span-1">
          <IdentityPanel ch={ch} patch={noop} />
          <CombatPanel ch={ch} patch={noop} />
          <DeathSavesPanel ch={ch} patch={noop} />
        </div>
        <div className="space-y-4 xl:col-span-1">
          <SkillsPanel ch={ch} patch={noop} />
          <SpellsPanel ch={ch} patch={noop} />
          <WealthPanel ch={ch} patch={noop} />
        </div>
        <div className="space-y-4 xl:col-span-1">
          <EquipmentPanel ch={ch} patch={noop} />
          <FeaturesPanel ch={ch} patch={noop} />
          <PersonalityPanel ch={ch} patch={noop} />
        </div>
      </div>
    </div>
  );
}
