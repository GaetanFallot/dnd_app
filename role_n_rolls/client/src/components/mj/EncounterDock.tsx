import { useRef, useState } from 'react';
import { useMj } from '@/stores/mj';
import type { Monster } from '@/types/monster';
import { StatBlock } from './StatBlock';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  Trash2,
  Upload,
  BookOpen,
  Eraser,
} from 'lucide-react';

interface Props {
  onOpenBrowser: () => void;
  onOpenEditor: (existing?: Monster) => void;
}

export function EncounterDock({ onOpenBrowser, onOpenEditor }: Props) {
  const {
    encounterMonsters,
    updateEncounterMonster,
    removeEncounterMonster,
    clearEncounter,
    addEncounterMonster,
    addCombatant,
  } = useMj();
  const [collapsed, setCollapsed] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const handleImport = async (files: FileList) => {
    for (const f of Array.from(files)) {
      try {
        const text = await f.text();
        const parsed = JSON.parse(text) as Monster | Monster[];
        const list = Array.isArray(parsed) ? parsed : [parsed];
        list.forEach((m) => addEncounterMonster({ ...m, source: 'custom' }));
      } catch (err) {
        console.warn('[encounter] import failed', f.name, err);
      }
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-night-deep/95 border-t-2 border-gold/40 backdrop-blur-sm shadow-[0_-4px_20px_rgba(0,0,0,0.6)]">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/40">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-2 font-display uppercase tracking-wider text-sm text-gold"
        >
          {collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          ⚔ Rencontre
          {encounterMonsters.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded bg-gold text-night text-[10px] font-bold">
              {encounterMonsters.length}
            </span>
          )}
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onOpenBrowser}
          className="btn-rune text-xs px-3 py-1.5"
          title="Parcourir la bibliothèque de monstres"
        >
          <BookOpen className="w-3 h-3" /> Bibliothèque
        </button>
        <button
          type="button"
          onClick={() => onOpenEditor()}
          className="btn-rune text-xs px-3 py-1.5"
        >
          <Plus className="w-3 h-3" /> Nouveau
        </button>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="btn-rune text-xs px-3 py-1.5"
          title="Importer un monstre (JSON)"
        >
          <Upload className="w-3 h-3" /> Importer
        </button>
        <button
          type="button"
          onClick={clearEncounter}
          disabled={!encounterMonsters.length}
          className="btn-blood text-xs px-3 py-1.5"
        >
          <Eraser className="w-3 h-3" /> Vider
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void handleImport(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {!collapsed && (
        <div className="max-h-[45vh] overflow-y-auto px-4 py-2 space-y-2">
          {encounterMonsters.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-6">
              Aucun monstre dans la rencontre. Ouvre la bibliothèque, crée-en un, ou importe un JSON.
            </p>
          ) : (
            encounterMonsters.map((em) => (
              <div
                key={em.eid}
                className={cn(
                  'panel p-2',
                  em.hpCurrent === 0 && em.hpMax > 0 && 'opacity-60 grayscale',
                )}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateEncounterMonster(em.eid, { expanded: !em.expanded })}
                    className="text-parchment/70 hover:text-gold"
                    title={em.expanded ? 'Réduire' : 'Déplier'}
                  >
                    {em.expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                  <span className="font-display text-gold flex-1 truncate">{em.name}</span>
                  <div className="flex items-center gap-1 text-sm">
                    <button
                      type="button"
                      onClick={() =>
                        updateEncounterMonster(em.eid, { hpCurrent: Math.max(0, em.hpCurrent - 1) })
                      }
                      className="w-6 h-6 rounded border border-blood/50 hover:bg-blood/20 text-blood flex items-center justify-center"
                      title="-1 PV"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      value={em.hpCurrent}
                      onChange={(e) =>
                        updateEncounterMonster(em.eid, { hpCurrent: Math.max(0, Number(e.target.value) || 0) })
                      }
                      className="w-14 text-center bg-input border border-border/60 rounded py-0.5 text-sm focus:outline-none focus:border-gold"
                    />
                    <span className="text-muted-foreground">/ {em.hpMax}</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateEncounterMonster(em.eid, { hpCurrent: em.hpCurrent + 1 })
                      }
                      className="w-6 h-6 rounded border border-emerald-500/50 hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center"
                      title="+1 PV"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const initStr = window.prompt(`Initiative pour "${em.name}" ?`, '10');
                      if (initStr === null) return;
                      addCombatant({
                        name: em.name,
                        initiative: Number(initStr) || 0,
                        hp: em.hpCurrent,
                        maxHp: em.hpMax,
                      });
                    }}
                    className="btn-rune text-[10px] px-2 py-1"
                    title="Ajouter à l'initiative"
                  >
                    ⚔ Init
                  </button>
                  <button
                    type="button"
                    onClick={() => removeEncounterMonster(em.eid)}
                    className="text-blood hover:text-blood-light"
                    title="Retirer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {em.expanded && (
                  <div className="mt-2 grid md:grid-cols-[1fr_1fr] gap-3">
                    <div className="bg-night-deep/60 rounded p-3 max-h-64 overflow-y-auto">
                      <StatBlock monster={em.data} compact />
                    </div>
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={em.notes}
                        onChange={(e) => updateEncounterMonster(em.eid, { notes: e.target.value })}
                        placeholder="Notes de combat (conditions, tactiques…)"
                        className="flex-1 min-h-24 bg-input border border-border/60 rounded p-2 text-sm focus:outline-none focus:border-gold resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenEditor(em.data)}
                          className="btn-rune flex-1 text-xs"
                        >
                          Éditer fiche
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
