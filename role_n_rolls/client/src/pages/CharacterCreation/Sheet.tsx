import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCharacter, useUpdateCharacter } from '@/hooks/useCharacters';
import { usePanelLayout, type PanelId } from '@/stores/panelLayout';
import { GridstackSheet } from './GridstackSheet';
import { recalcDerived } from '@/lib/helpers/dndRules';
import type { DnDCharacter } from '@/types/character';
import { buildShareUrl, downloadJson } from '@/lib/helpers/characterShare';
import { applyLongRest, applyShortRest } from '@/lib/helpers/rest';
import {
  ChevronLeft,
  Download,
  Share2,
  RefreshCw,
  Moon,
  Coffee,
  RotateCcw,
  Loader2,
  Check,
  CloudOff,
  User,
  Swords,
  Skull,
  Target,
  Wand2,
  Coins,
  Package,
  BookOpen,
  Feather,
  Pencil,
} from 'lucide-react';
import {
  CombatPanel,
  DeathSavesPanel,
  EquipmentPanel,
  FeaturesPanel,
  IdentityPanel,
  PersonalityPanel,
  ResourcesPanel,
  SkillsPanel,
  SpellsPanel,
  WealthPanel,
} from './panels';

type Patch = (p: Partial<DnDCharacter>) => void;

const PANEL_RENDERERS: Record<PanelId, (ch: DnDCharacter, patch: Patch) => React.ReactNode> = {
  identity: (ch, patch) => <IdentityPanel ch={ch} patch={patch} />,
  combat: (ch, patch) => <CombatPanel ch={ch} patch={patch} />,
  deathSaves: (ch, patch) => <DeathSavesPanel ch={ch} patch={patch} />,
  skills: (ch, patch) => <SkillsPanel ch={ch} patch={patch} />,
  spells: (ch, patch) => <SpellsPanel ch={ch} patch={patch} />,
  wealth: (ch, patch) => <WealthPanel ch={ch} patch={patch} />,
  resources: (ch, patch) => <ResourcesPanel ch={ch} patch={patch} />,
  equipment: (ch, patch) => <EquipmentPanel ch={ch} patch={patch} />,
  features: (ch, patch) => <FeaturesPanel ch={ch} patch={patch} />,
  personality: (ch, patch) => <PersonalityPanel ch={ch} patch={patch} />,
};

const SAVE_DEBOUNCE_MS = 600;

const MOBILE_PANEL_META: Record<PanelId, { label: string; Icon: typeof User }> = {
  identity:    { label: 'Identité', Icon: User },
  combat:      { label: 'Combat',   Icon: Swords },
  deathSaves:  { label: 'Mort',     Icon: Skull },
  skills:      { label: 'Compét.',  Icon: Target },
  spells:      { label: 'Sorts',    Icon: Wand2 },
  wealth:      { label: 'Trésor',   Icon: Coins },
  resources:   { label: 'Ress.',    Icon: RefreshCw },
  equipment:   { label: 'Équip.',   Icon: Package },
  features:    { label: 'Aptit.',   Icon: BookOpen },
  personality: { label: 'Persona.', Icon: Feather },
};

const MOBILE_PANEL_ORDER: PanelId[] = [
  'identity', 'combat', 'skills', 'spells', 'features',
  'equipment', 'resources', 'wealth', 'deathSaves', 'personality',
];

export function Sheet() {
  const { characterId } = useParams<{ characterId: string }>();
  const nav = useNavigate();
  const query = useCharacter(characterId);
  const updateM = useUpdateCharacter();
  const { order, editMode, toggleEdit, reset: resetLayout } = usePanelLayout();
  const [toast, setToast] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<PanelId>('identity');
  const [gridNonce, setGridNonce] = useState(0);

  // Local editing buffer — seeded from the query once, then patched locally
  // and flushed to Supabase via a debounced mutation.
  const [ch, setCh] = useState<DnDCharacter | null>(null);
  const [dirty, setDirty] = useState(false);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    if (query.data && !ch) setCh(query.data.data);
  }, [query.data, ch]);

  const flushNow = useCallback(
    (next: DnDCharacter) => {
      if (!characterId) return;
      updateM.mutate(
        { id: characterId, data: next },
        {
          onSuccess: () => setDirty(false),
        },
      );
    },
    [characterId, updateM],
  );

  const scheduleSave = useCallback(
    (next: DnDCharacter) => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => flushNow(next), SAVE_DEBOUNCE_MS);
    },
    [flushNow],
  );

  // Flush pending save when unmounting or switching character.
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
    };
  }, [characterId]);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const patch: Patch = useCallback(
    (p) => {
      setCh((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...p };
        setDirty(true);
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  const saveStatus = useMemo(() => {
    if (updateM.isPending) return 'saving' as const;
    if (dirty) return 'pending' as const;
    if (updateM.isError) return 'error' as const;
    return 'saved' as const;
  }, [updateM.isPending, updateM.isError, dirty]);

  // Must stay above any conditional early returns — calling a hook after a
  // return would break React's hook ordering (React #321 / "Rendered more
  // hooks than during the previous render").
  const renderPanel = useCallback(
    (pid: PanelId) => (ch ? PANEL_RENDERERS[pid](ch, patch) : null),
    [ch, patch],
  );

  if (query.isLoading || (!ch && !query.isError)) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-gold animate-spin" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground italic">
          {query.isError
            ? `Erreur : ${(query.error as Error).message}`
            : 'Personnage introuvable.'}
        </p>
        <button type="button" onClick={() => nav('/character')} className="btn-rune mt-4">
          <ChevronLeft className="w-4 h-4" /> Retour au roster
        </button>
      </div>
    );
  }

  if (!ch) return null;

  const recalc = () => {
    const next = { ...ch, ...recalcDerived(ch) };
    setCh(next);
    setDirty(true);
    flushNow(next);
    flash('✓ Stats dérivées recalculées');
  };

  const doShortRest = () => {
    const next = { ...ch, ...applyShortRest(ch) };
    setCh(next);
    setDirty(true);
    flushNow(next);
    flash('☕ Court repos');
  };

  const doLongRest = () => {
    const next = { ...ch, ...applyLongRest(ch) };
    setCh(next);
    setDirty(true);
    flushNow(next);
    flash('🌙 Long repos');
  };

  const share = async () => {
    const url = buildShareUrl(ch);
    try {
      await navigator.clipboard.writeText(url);
      flash('🔗 Lien copié');
    } catch {
      window.prompt('Copie ce lien :', url);
    }
  };

  return (
    <div className="h-full overflow-auto">
      <header
        className={
          'sticky top-0 z-20 bg-night/95 backdrop-blur border-b border-border/60 px-3 py-2 ' +
          'flex items-center gap-2 flex-wrap sm:px-4 sm:py-3 sm:gap-3'
        }
      >
        <button type="button" onClick={() => nav('/character')} className="btn-rune text-xs">
          <ChevronLeft className="w-3 h-3" />
          <span className="hidden sm:inline">Roster</span>
        </button>
        <h1 className="heading-rune text-base sm:text-xl flex-1 min-w-0 truncate">
          {ch._classIcon} {ch.char_name}
          <span className="text-muted-foreground ml-2 text-xs font-normal normal-case">
            {ch._className || '—'} · Niv. {ch.level}
          </span>
        </h1>
        <SaveIndicator status={saveStatus} />
        <button type="button" onClick={doShortRest} className="btn-rune text-xs" title="Court repos">
          <Coffee className="w-3 h-3" /><span className="hidden md:inline">Court</span>
        </button>
        <button type="button" onClick={doLongRest} className="btn-rune text-xs" title="Long repos">
          <Moon className="w-3 h-3" /><span className="hidden md:inline">Long</span>
        </button>
        <button type="button" onClick={recalc} className="btn-rune text-xs" title="Recalculer">
          <RefreshCw className="w-3 h-3" /><span className="hidden md:inline">Recalc.</span>
        </button>
        <button type="button" onClick={share} className="btn-rune text-xs" title="Partager">
          <Share2 className="w-3 h-3" /><span className="hidden md:inline">Partager</span>
        </button>
        <button type="button" onClick={() => downloadJson(ch)} className="btn-rune text-xs" title="Exporter JSON">
          <Download className="w-3 h-3" /><span className="hidden md:inline">JSON</span>
        </button>
        <button
          type="button"
          onClick={() => {
            toggleEdit();
            flash(editMode ? 'Mode lecture' : 'Mode édition — déplace, redimensionne');
          }}
          className={
            'btn-rune text-xs ' +
            (editMode ? 'bg-gold/15 border-gold text-gold' : '')
          }
          title={editMode ? 'Verrouiller la mise en page' : 'Déverrouiller pour réorganiser'}
        >
          <Pencil className="w-3 h-3" />
          <span className="hidden md:inline">{editMode ? 'Verrouiller' : 'Édition'}</span>
        </button>
        {editMode && (
          <button
            type="button"
            onClick={() => {
              resetLayout();
              setGridNonce((n) => n + 1);
              flash('Mise en page restaurée');
            }}
            className="btn-rune text-xs"
            title="Réinitialiser la disposition"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </header>

      {/* Desktop/tablet: Gridstack widget board (4 cols, drag+resize in edit mode) */}
      <div className="hidden md:block pb-6 p-3 sm:p-4">
        <GridstackSheet
          editMode={editMode}
          panelIds={order}
          renderPanel={renderPanel}
          nonce={gridNonce}
        />
      </div>

      {/* Mobile: single active panel + fixed bottom nav */}
      <div className="md:hidden pb-20 px-3 py-3 space-y-3">
        {PANEL_RENDERERS[mobilePanel](ch, patch)}
      </div>
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-night-deep/95 backdrop-blur border-t border-gold/30 overflow-x-auto"
        aria-label="Navigation panneaux"
      >
        <div className="flex">
          {MOBILE_PANEL_ORDER.map((pid) => {
            const { label, Icon } = MOBILE_PANEL_META[pid];
            const active = pid === mobilePanel;
            return (
              <button
                key={pid}
                type="button"
                onClick={() => setMobilePanel(pid)}
                className={
                  'flex-1 min-w-[64px] flex flex-col items-center gap-1 py-2 px-1 transition-colors ' +
                  (active
                    ? 'text-gold bg-gold/10 border-t-2 border-gold'
                    : 'text-parchment/70 border-t-2 border-transparent')
                }
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px] uppercase tracking-wider font-display font-bold truncate max-w-full">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {toast && (
        <div
          className={
            'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 panel px-4 py-2 ' +
            'font-display uppercase tracking-wider text-sm animate-fade-in border-gold/60'
          }
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function SaveIndicator({ status }: { status: 'saved' | 'saving' | 'pending' | 'error' }) {
  if (status === 'saving') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" /> Enregistrement
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-amber-400/80">
        <Loader2 className="w-3 h-3 animate-pulse" /> Modifié
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-blood">
        <CloudOff className="w-3 h-3" /> Erreur
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-emerald-400/80">
      <Check className="w-3 h-3" /> Sauvé
    </span>
  );
}
