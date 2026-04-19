import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMj, type FitMode } from '@/stores/mj';
import { SCENES, type Scene } from '@/data/scenes';
import { useSecondScreen } from '@/hooks/useSecondScreen';
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
import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
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

  const { isOpen, open, close, send, sendScene, sendOverlays, sendTurnOrder } = useSecondScreen();
  const { scenes: customScenes, addFromFile, rename, remove } = useCustomScenesDb();

  const [scenesCollapsed, setScenesCollapsed] = useState(false);
  const [customCollapsed, setCustomCollapsed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  }, []);

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

  return (
    <div className="h-full overflow-auto pb-[48vh]">
      <header className="px-6 py-4 border-b border-border/60">
        <h1 className="heading-rune text-2xl flex items-center gap-3">
          ⚔ Écran MJ ⚔
        </h1>
      </header>

      <div
        className={cn(
          'grid gap-4 p-3 sm:p-4 grid-cols-1',
          leftCollapsed ? 'lg:grid-cols-[40px_1fr_280px]' : 'lg:grid-cols-[260px_1fr_280px]',
        )}
      >
        {/* Left column — controls (collapsible) */}
        {leftCollapsed ? (
          <button
            type="button"
            onClick={() => setLeftCollapsed(false)}
            className="panel p-2 h-fit text-gold/70 hover:text-gold sticky top-2"
            title="Afficher le panneau latéral"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setLeftCollapsed(true)}
              className="text-muted-foreground hover:text-gold text-xs flex items-center gap-1"
              title="Masquer le panneau"
            >
              <PanelLeftClose className="w-3 h-3" /> Réduire
            </button>
          </div>
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
          <OverlayPanel onChange={() => { /* effects re-synced via useEffect */ }} />
          <Soundboard />
          <SceneImportPanel onFiles={onFiles} />
        </div>
        )}

        {/* Center — scenes grid */}
        <main className="space-y-4 min-w-0">
          <NowPlayingBar scene={activeScene} />

          <section>
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

          {customSceneCount > 0 && (
            <section>
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
          )}
        </main>

        {/* Right — initiative */}
        <InitiativePanel
          onChange={() => { /* resync via useEffect */ }}
          onCombatantClick={() => setLeftCollapsed(true)}
        />
      </div>

      {/* Encounter dock + monster browser */}
      <EncounterDock
        onOpenBrowser={() => setBrowserOpen(true)}
        onOpenEditor={() => showToast('Éditeur de monstre à venir (Phase C+)')}
      />
      <MonsterBrowser open={browserOpen} onClose={() => setBrowserOpen(false)} />

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
