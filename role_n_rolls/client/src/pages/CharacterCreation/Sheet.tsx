import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useCharacter, useUpdateCharacter } from '@/hooks/useCharacters';
import { usePanelLayout, type ColumnId, type PanelId } from '@/stores/panelLayout';
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
} from 'lucide-react';
import { SortablePanel } from '@/components/character/SortablePanel';
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

const COLUMNS: ColumnId[] = ['left', 'center', 'right'];
const SAVE_DEBOUNCE_MS = 600;

function findColumn(order: Record<ColumnId, PanelId[]>, id: string): ColumnId | null {
  for (const c of COLUMNS) if (order[c].includes(id as PanelId)) return c;
  return null;
}

export function Sheet() {
  const { characterId } = useParams<{ characterId: string }>();
  const nav = useNavigate();
  const query = useCharacter(characterId);
  const updateM = useUpdateCharacter();
  const { order, setOrder, reset: resetLayout } = usePanelLayout();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  );

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

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragOver = (e: DragOverEvent) => {
    const from = findColumn(order, String(e.active.id));
    const overId = String(e.over?.id ?? '');
    const to = findColumn(order, overId) ?? (COLUMNS.includes(overId as ColumnId) ? (overId as ColumnId) : null);
    if (!from || !to || from === to) return;
    const next = {
      ...order,
      [from]: order[from].filter((p) => p !== e.active.id),
      [to]: [...order[to], e.active.id as PanelId],
    };
    setOrder(next);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const col = findColumn(order, String(e.active.id));
    if (!col || !e.over) return;
    const fromIdx = order[col].indexOf(e.active.id as PanelId);
    const toIdx = order[col].indexOf(e.over.id as PanelId);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
    setOrder({ ...order, [col]: arrayMove(order[col], fromIdx, toIdx) });
  };

  const renderColumn = (col: ColumnId) => (
    <SortableContext items={order[col]} strategy={verticalListSortingStrategy}>
      <div className="space-y-4" data-column={col}>
        {order[col].map((pid) => (
          <SortablePanel key={pid} id={pid}>
            {PANEL_RENDERERS[pid](ch, patch)}
          </SortablePanel>
        ))}
      </div>
    </SortableContext>
  );

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
            resetLayout();
            flash('Mise en page restaurée');
          }}
          className="btn-rune text-xs"
          title="Réinitialiser la disposition des panneaux"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="grid gap-4 p-3 sm:p-4 xl:grid-cols-3 lg:grid-cols-2 grid-cols-1">
          {renderColumn('left')}
          {renderColumn('center')}
          {renderColumn('right')}
        </div>
        <DragOverlay>
          {activeId && (
            <div className="panel p-4 opacity-90 shadow-[0_0_30px_rgba(201,168,76,0.4)] rotate-1">
              <div className="heading-rune text-sm">Déplacement…</div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

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
