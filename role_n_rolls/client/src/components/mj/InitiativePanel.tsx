import { useRef, useState } from 'react';
import { useMj, type Combatant } from '@/stores/mj';
import { cn } from '@/lib/utils';
import { GripVertical, Trash2, ArrowDownUp, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';

interface Props {
  onChange: () => void;
  onCombatantClick?: () => void;
}

export function InitiativePanel({ onChange, onCombatantClick }: Props) {
  const {
    combatants,
    setCombatants,
    addCombatant,
    removeCombatant,
    sortInit,
    nextTurn,
    prevTurn,
    clearInit,
    currentIdx,
    round,
    showInitOnScreen,
    toggleInitDisplay,
  } = useMj();

  const [name, setName] = useState('');
  const [init, setInit] = useState('');
  const dragIdx = useRef<number | null>(null);

  const submit = () => {
    const n = name.trim();
    if (!n) return;
    addCombatant({ name: n, initiative: Number(init) || 0 });
    setName('');
    setInit('');
    onChange();
  };

  const onDragStart = (i: number) => () => {
    dragIdx.current = i;
  };
  const onDragOver = (i: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === i) return;
    const from = dragIdx.current;
    const next: Combatant[] = [...combatants];
    const [moved] = next.splice(from, 1);
    next.splice(i, 0, moved);
    dragIdx.current = i;
    setCombatants(next);
  };
  const onDragEnd = () => {
    dragIdx.current = null;
    onChange();
  };

  return (
    <aside className="panel p-4 space-y-3 min-w-0">
      <div className="heading-rune text-sm flex items-center gap-2">
        ⚔ Ordre d'initiative
      </div>
      <div className="flex gap-1">
        <input
          type="text"
          placeholder="Nom"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          className="flex-1 bg-input border border-border/60 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-gold"
        />
        <input
          type="number"
          placeholder="Init"
          value={init}
          onChange={(e) => setInit(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          className="w-16 bg-input border border-border/60 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-gold"
        />
        <button type="button" onClick={submit} className="btn-rune px-3">＋</button>
      </div>
      <div className="flex gap-1">
        <button type="button" onClick={() => { sortInit(); onChange(); }} className="btn-rune flex-1 text-xs px-2">
          <ArrowDownUp className="w-3 h-3" /> Trier
        </button>
        <button type="button" onClick={() => { prevTurn(); onChange(); }} className="btn-rune text-xs px-2" disabled={!combatants.length}>
          <ChevronLeft className="w-3 h-3" />
        </button>
        <button type="button" onClick={() => { nextTurn(); onChange(); }} className="btn-rune text-xs px-2" disabled={!combatants.length}>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <button
        type="button"
        onClick={() => { toggleInitDisplay(); onChange(); }}
        className={cn(
          'btn-rune w-full text-xs',
          showInitOnScreen && 'bg-gold/15 border-gold text-gold',
        )}
      >
        {showInitOnScreen ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
        {showInitOnScreen ? 'Affiché sur l\'écran 2' : 'Afficher sur l\'écran 2'}
      </button>
      <div className="text-center font-display uppercase tracking-wider text-gold text-sm">
        Round <span className="text-lg">{round}</span>
      </div>
      <div className="space-y-1 max-h-[40vh] overflow-y-auto">
        {combatants.map((c, i) => (
          <div
            key={c.id}
            draggable
            onDragStart={onDragStart(i)}
            onDragOver={onDragOver(i)}
            onDragEnd={onDragEnd}
            onClick={() => onCombatantClick?.()}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded border cursor-pointer',
              i === currentIdx
                ? 'border-gold bg-gold/10 shadow-[0_0_10px_rgba(201,168,76,0.3)]'
                : 'border-border/60 bg-night-deep/40 hover:border-gold/40',
            )}
          >
            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
            <span className="font-display text-gold w-8 text-center">{c.initiative}</span>
            <span className="flex-1 text-sm truncate">{c.name}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeCombatant(c.id); onChange(); }}
              className="text-blood hover:text-blood-light"
              title="Retirer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {!combatants.length && (
          <div className="text-center text-xs text-muted-foreground italic py-6">
            Aucun combattant — ajoute un nom et une initiative
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => { clearInit(); onChange(); }}
        className="btn-rune w-full text-xs"
        disabled={!combatants.length}
      >
        <Trash2 className="w-3 h-3" /> Vider l'initiative
      </button>
    </aside>
  );
}
