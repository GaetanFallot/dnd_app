import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMj, type FitMode } from '@/stores/mj';
import { SCENES, type Scene } from '@/data/scenes';
import { useSecondScreenCtx } from '@/components/shared/SecondScreenProvider';
import { useCustomScenesDb } from '@/hooks/useCustomScenesDb';
import { SceneCard } from '@/components/mj/SceneCard';
import { OverlayPanel } from '@/components/mj/OverlayPanel';
import { InitiativePanel } from '@/components/mj/InitiativePanel';
import { SecondScreenPanel } from '@/components/mj/SecondScreenPanel';
import { SceneImportPanel } from '@/components/mj/SceneImportPanel';
import { NowPlayingBar } from '@/components/mj/NowPlayingBar';
import { Soundboard } from '@/components/mj/Soundboard';
import { EncounterDock } from '@/components/mj/EncounterDock';
import { MonsterBrowser } from '@/components/mj/MonsterBrowser';
import { MonsterEditor } from '@/components/mj/MonsterEditor';
import { useCustomMonstersDb } from '@/hooks/useCustomMonstersDb';
import type { Monster } from '@/types/monster';
import { CampaignMapsDock } from '@/components/mj/CampaignMapsDock';
import { LoreDock } from '@/components/mj/LoreDock';
import { MjBoard } from './MjBoard';
import { useMjLayout, type MjWidgetId } from '@/stores/mjLayout';
import { Pencil, RotateCcw } from 'lucide-react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MJScreen() {
  const {
    activeScene,
    setActiveScene,
    fit,
    setFit,
    activeOverlays,
    masterVolume,
    stormMode,
    combatants,
    currentIdx,
    round,
    showInitOnScreen,
  } = useMj();

  const { isOpen, open, close, send, sendScene, sendOverlays, sendTurnOrder } = useSecondScreenCtx();
  const { scenes: customScenes, addFromFile, rename, remove } = useCustomScenesDb();
  const { add: addCustomMonster, update: updateCustomMonster } = useCustomMonstersDb();

  const [scenesCollapsed, setScenesCollapsed] = useState(false);
  const [customCollapsed, setCustomCollapsed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorInitial, setEditorInitial] = useState<Monster | null>(null);
  const [gridNonce, setGridNonce] = useState(0);
  const { order: mjOrder, editMode: mjEdit, toggleEdit: toggleMjEdit, reset: resetMj } = useMjLayout();

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  }, []);

  const openEditor = useCallback((existing?: Monster) => {
    if (existing && existing.source === 'srd') {
      showToast('Les monstres SRD sont en lecture seule — duplique-le pour le modifier');
      return;
    }
    setEditorInitial(existing ?? null);
    setEditorOpen(true);
  }, [showToast]);

  const duplicateAndEdit = useCallback((existing: Monster) => {
    const clone: Monster = {
      ...existing,
      slug: undefined,
      id: undefined,
      name: `${existing.name} (copie)`,
      source: 'custom',
    };
    setEditorInitial(clone);
    setEditorOpen(true);
  }, []);

  const handleEditorSave = useCallback(async (monster: Monster) => {
    if (monster.slug && editorInitial?.slug === monster.slug) {
      await updateCustomMonster(monster.slug, monster);
      showToast(`✓ ${monster.name} mis à jour`);
    } else {
      await addCustomMonster(monster);
      showToast(`✓ ${monster.name} créé`);
    }
  }, [addCustomMonster, editorInitial, showToast, updateCustomMonster]);

  // Resync any time the store changes and the popup is open.
  const syncAll = useCallback(() => {
    if (!isOpen) return;
    sendScene(activeScene, fit);
    sendOverlays(activeOverlays);
    send({ type: 'master-volume', volume: masterVolume });
    send({ type: 'storm-mode', active: stormMode });
    sendTurnOrder(showInitOnScreen, combatants, currentIdx, round);
  }, [
    isOpen, activeScene, fit, activeOverlays, masterVolume, stormMode,
    combatants, currentIdx, round, showInitOnScreen,
    send, sendScene, sendOverlays, sendTurnOrder,
  ]);

  // Re-sync turn order whenever it changes — so nextTurn/prevTurn mirror live.
  useEffect(() => {
    if (!isOpen) return;
    sendTurnOrder(showInitOnScreen, combatants, currentIdx, round);
  }, [isOpen, combatants, currentIdx, round, showInitOnScreen, sendTurnOrder]);

  // Re-sync overlays/volume when they change.
  useEffect(() => {
    if (!isOpen) return;
    sendOverlays(activeOverlays);
  }, [isOpen, activeOverlays, sendOverlays]);

  useEffect(() => {
    if (!isOpen) return;
    send({ type: 'master-volume', volume: masterVolume });
  }, [isOpen, masterVolume, send]);

  useEffect(() => {
    if (!isOpen) return;
    send({ type: 'storm-mode', active: stormMode });
  }, [isOpen, stormMode, send]);

  const toggleSecondScreen = useCallback(() => {
    if (isOpen) {
      close();
      showToast('Écran 2 fermé');
      return;
    }
    const w = open();
    if (!w) {
      showToast('⚠️ Autorisez les popups pour ouvrir l\'écran 2');
      return;
    }
    // Wait for it to load, then push full state.
    const pushAll = () => {
      syncAll();
      showToast('✓ Écran 2 ouvert');
    };
    // Blob-loaded popups fire `load` shortly after window.open resolves.
    // As a safety net we also push again after a short delay.
    w.addEventListener('load', pushAll, { once: true });
    window.setTimeout(pushAll, 300);
  }, [isOpen, open, close, syncAll, showToast]);

  const onSceneSelect = useCallback(
    (scene: Scene) => {
      setActiveScene(scene);
      if (isOpen) sendScene(scene, fit);
    },
    [setActiveScene, isOpen, sendScene, fit],
  );

  const onFitChange = useCallback(
    (f: FitMode) => {
      setFit(f);
      if (isOpen) send({ type: 'fit', fit: f });
    },
    [setFit, isOpen, send],
  );

  const onFiles = useCallback(
    async (files: FileList) => {
      const toAdd = Array.from(files);
      for (const f of toAdd) {
        const s = await addFromFile(f);
        showToast(`✓ ${s.name}`);
      }
    },
    [addFromFile, showToast],
  );

  const activeSceneId = activeScene?.id;
  const customSceneCount = customScenes.length;
  const visibleCustom = useMemo(() => customScenes, [customScenes]);

  const renderWidget = useCallback(
    (id: MjWidgetId): React.ReactNode => {
      switch (id) {
        case 'secondScreen':
          return (
            <SecondScreenPanel
              isOpen={isOpen}
              onToggle={toggleSecondScreen}
              onFullscreen={() => {
                if (!isOpen) return showToast('⚠️ Ouvre d\'abord l\'écran 2');
                send({ type: 'fullscreen' });
              }}
              onBlack={() => {
                if (!isOpen) return showToast('⚠️ Ouvre d\'abord l\'écran 2');
                send({ type: 'black' });
              }}
              onFitChange={onFitChange}
            />
          );
        case 'overlays':
          return <OverlayPanel onChange={() => { /* synced via useEffect */ }} />;
        case 'soundboard':
          return <Soundboard />;
        case 'maps':
          return <CampaignMapsDock />;
        case 'lore':
          return <LoreDock />;
        case 'sceneImport':
          return <SceneImportPanel onFiles={onFiles} />;
        case 'nowPlaying':
          return <NowPlayingBar scene={activeScene} />;
        case 'scenes':
          return (
            <section className="panel p-3 h-full overflow-auto">
              <button
                type="button"
                onClick={() => setScenesCollapsed((c) => !c)}
                className="flex items-center gap-2 mb-3 heading-rune text-sm"
              >
                {scenesCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Scènes D&amp;D <span className="text-muted-foreground normal-case">({SCENES.length})</span>
              </button>
              {!scenesCollapsed && (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                  {SCENES.map((s) => (
                    <SceneCard
                      key={s.id}
                      scene={s}
                      active={activeSceneId === s.id}
                      onSelect={() => onSceneSelect(s)}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        case 'imports':
          return customSceneCount > 0 ? (
            <section className="panel p-3 h-full overflow-auto">
              <button
                type="button"
                onClick={() => setCustomCollapsed((c) => !c)}
                className="flex items-center gap-2 mb-3 heading-rune text-sm"
              >
                {customCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Mes imports <span className="text-muted-foreground normal-case">({customSceneCount})</span>
              </button>
              {!customCollapsed && (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                  {visibleCustom.map((s) => (
                    <SceneCard
                      key={s.id}
                      scene={s}
                      active={activeSceneId === s.id}
                      onSelect={() => onSceneSelect(s)}
                      onRename={() => {
                        const name = window.prompt('Nouveau nom', s.name);
                        if (name && name.trim()) rename(s.id, name.trim());
                      }}
                      onDelete={() => {
                        if (!window.confirm(`Supprimer "${s.name}" ?`)) return;
                        remove(s.id);
                        if (activeSceneId === s.id) setActiveScene(null);
                      }}
                    />
                  ))}
                </div>
              )}
            </section>
          ) : (
            <div className="panel p-3 h-full flex items-center justify-center text-xs italic text-muted-foreground">
              Aucun import de scène pour l'instant.
            </div>
          );
        case 'initiative':
          return (
            <InitiativePanel
              onChange={() => { /* synced via useEffect */ }}
            />
          );
      }
    },
    [
      isOpen, toggleSecondScreen, send, showToast, onFitChange, onFiles, activeScene,
      scenesCollapsed, activeSceneId, onSceneSelect, customSceneCount,
      customCollapsed, visibleCustom, rename, remove, setActiveScene,
    ],
  );

  return (
    <div className="h-full overflow-auto pb-[48vh]">
      <header className="px-6 py-4 border-b border-border/60 flex items-center gap-3">
        <h1 className="heading-rune text-2xl flex items-center gap-3 flex-1">
          ⚔ Écran MJ ⚔
        </h1>
        <button
          type="button"
          onClick={() => {
            toggleMjEdit();
            showToast(mjEdit ? 'Mise en page verrouillée' : 'Édition — glisse et redimensionne');
          }}
          className={cn(
            'btn-rune text-xs',
            mjEdit && 'bg-gold/15 border-gold text-gold',
          )}
        >
          <Pencil className="w-3 h-3" />
          {mjEdit ? 'Verrouiller' : 'Édition'}
        </button>
        {mjEdit && (
          <button
            type="button"
            onClick={() => {
              resetMj();
              setGridNonce((n) => n + 1);
              showToast('Mise en page restaurée');
            }}
            className="btn-rune text-xs"
            title="Réinitialiser la disposition"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </header>

      <div className="p-3 sm:p-4">
        <MjBoard
          editMode={mjEdit}
          widgetIds={mjOrder}
          renderWidget={renderWidget}
          nonce={gridNonce}
        />
      </div>

      {/* Encounter dock + monster browser */}
      <EncounterDock
        onOpenBrowser={() => setBrowserOpen(true)}
        onOpenEditor={openEditor}
        onDuplicate={duplicateAndEdit}
      />
      <MonsterBrowser
        open={browserOpen}
        onClose={() => setBrowserOpen(false)}
        onEdit={openEditor}
        onDuplicate={duplicateAndEdit}
      />
      <MonsterEditor
        open={editorOpen}
        initial={editorInitial}
        onClose={() => setEditorOpen(false)}
        onSave={handleEditorSave}
      />

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
            'panel px-4 py-2 font-display uppercase tracking-wider text-sm',
            'animate-fade-in shadow-xl border-gold/60',
          )}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
