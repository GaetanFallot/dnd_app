/**
 * Character sheet panels — Combat, Spells, Equipment, Features, Personality, Death Saves.
 *
 * Each panel receives the current character and a `patch` callback that
 * merges a partial update back into the store (auto-saved there).
 */

import type { DnDCharacter, AbilityKey, DnDSpell, DnDResource, ResourceRecharge } from '@/types/character';
import { blankResource } from '@/lib/helpers/rest';
import {
  ABILITIES,
  ABILITY_LABELS,
  ABILITY_SHORT,
  SKILLS,
  abilityOf,
  mod,
  profBonus,
  saveProfOf,
  getSlots,
} from '@/lib/helpers/dndRules';
import { cn } from '@/lib/utils';
import { Plus, Trash2, BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { SpellBrowser } from '@/components/character/SpellBrowser';
import { SpellCard } from '@/components/character/SpellCard';
import { ClassPicker } from '@/components/character/ClassPicker';
import { FeaturesModal } from '@/components/character/FeaturesModal';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useDndSpellsAoe } from '@/hooks/useDndSpellsAoe';

type Patch = (p: Partial<DnDCharacter>) => void;

interface PanelProps {
  ch: DnDCharacter;
  patch: Patch;
}

function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('panel p-4 flex flex-col gap-3 min-h-0', className)}>
      <h3 className="heading-rune text-sm border-b border-border/60 pb-2 shrink-0">{title}</h3>
      <div className="flex-1 min-h-0 flex flex-col gap-3">{children}</div>
    </section>
  );
}

function NumField({ label, value, onChange, min, max, className }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; className?: string;
}) {
  return (
    <label className={cn('flex flex-col gap-1', className)}>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="bg-input border border-border/60 rounded px-2 py-1 text-sm focus:outline-none focus:border-gold"
      />
    </label>
  );
}

function TextField({ label, value, onChange, className }: {
  label: string; value: string; onChange: (v: string) => void; className?: string;
}) {
  return (
    <label className={cn('flex flex-col gap-1', className)}>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-input border border-border/60 rounded px-2 py-1 text-sm focus:outline-none focus:border-gold"
      />
    </label>
  );
}

// ─── IDENTITY ────────────────────────────────────────────────────────────────

export function IdentityPanel({ ch, patch }: PanelProps) {
  const [picker, setPicker] = useState<null | 'class' | 'subclass' | 'race' | 'background'>(null);
  const uploadM = useImageUpload();
  const subclassFromFeatures =
    ch._features.find((f) => f.source.endsWith('(sous-classe)'))?.source.replace(' (sous-classe)', '') ?? '';

  const uploadPortrait = async (file: File) => {
    try {
      const { url } = await uploadM.mutateAsync(file);
      patch({ _portrait: url });
    } catch (err) {
      alert('Upload impossible : ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const pickerField = (label: string, value: string, kind: 'class' | 'race' | 'background' | 'subclass', disabled = false) => (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setPicker(kind)}
        className="bg-input border border-border/60 rounded px-2 py-1 text-sm text-left hover:border-gold focus:outline-none focus:border-gold disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {value || <span className="text-muted-foreground italic">{disabled ? 'Choisis une classe d\'abord' : 'Choisir…'}</span>}
      </button>
    </label>
  );

  return (
    <Panel title="Identité">
      <div className="flex items-start gap-3">
        <label
          className="relative w-20 h-20 rounded-full border-2 border-gold/40 bg-night-deep shrink-0 flex items-center justify-center text-3xl bg-cover bg-center cursor-pointer overflow-hidden"
          style={ch._portrait ? { backgroundImage: `url(${ch._portrait})` } : undefined}
          title="Cliquer pour charger un portrait (ou glisser une image)"
        >
          {!ch._portrait && (ch._classIcon || '🗡️')}
          {uploadM.isPending && (
            <div className="absolute inset-0 bg-night/70 grid place-items-center">
              <span className="text-gold text-xs animate-pulse">…</span>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploadM.isPending}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadPortrait(f);
              e.target.value = '';
            }}
          />
        </label>
        <div className="flex-1 grid grid-cols-2 gap-2">
          <TextField label="Nom" value={ch.char_name} onChange={(v) => patch({ char_name: v })} className="col-span-2" />
          {pickerField('Race', ch.race, 'race')}
          {pickerField('Classe', ch._className, 'class')}
          {pickerField('Sous-classe', subclassFromFeatures, 'subclass', !ch._classId)}
          {pickerField('Historique', ch.background, 'background')}
          <TextField label="Alignement" value={ch.alignment} onChange={(v) => patch({ alignment: v })} />
          <NumField label="Niveau" value={ch.level} onChange={(v) => patch({ level: Math.max(1, Math.min(20, v)) })} min={1} max={20} />
          <NumField label="Dé de vie" value={ch._hd} onChange={(v) => patch({ _hd: v })} min={4} max={12} />
        </div>
      </div>
      <ClassPicker
        open={!!picker}
        kind={(picker ?? 'class')}
        classFilter={ch._classId}
        existingFeatures={ch._features}
        level={ch.level}
        onClose={() => setPicker(null)}
        onPick={(p) => patch(p)}
      />
    </Panel>
  );
}

// ─── COMBAT (abilities, saves, skills, HP) ───────────────────────────────────

export function CombatPanel({ ch, patch }: PanelProps) {
  const pb = profBonus(ch.level);

  return (
    <Panel title="Combat">
      <div className="grid grid-cols-3 gap-2">
        <NumField label="CA" value={ch.ac} onChange={(v) => patch({ ac: v })} />
        <NumField label="Initiative" value={ch.initiative} onChange={(v) => patch({ initiative: v })} />
        <TextField label="Vitesse" value={ch.speed} onChange={(v) => patch({ speed: v })} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <NumField label="PV actuels" value={ch.hp_current} onChange={(v) => patch({ hp_current: v })} />
        <NumField label="PV max" value={ch.hp_max} onChange={(v) => patch({ hp_max: v })} />
        <NumField label="PV temp" value={ch.hp_temp} onChange={(v) => patch({ hp_temp: v })} />
      </div>

      <div className="pt-2 border-t border-border/40">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
          Caractéristiques (Maîtrise : +{pb})
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {ABILITIES.map((k) => {
            const score = abilityOf(ch, k);
            const m = mod(score);
            return (
              <div key={k} className="bg-night-deep/60 rounded p-2 text-center">
                <div className="text-[10px] uppercase tracking-wider text-gold">{ABILITY_SHORT[k]}</div>
                <input
                  type="number"
                  value={score}
                  min={1}
                  max={30}
                  onChange={(e) => patch({ [`ability_${k}`]: Number(e.target.value) || 10 } as Partial<DnDCharacter>)}
                  className="w-full text-center bg-transparent font-display text-lg focus:outline-none"
                />
                <div className="text-xs text-muted-foreground">({m >= 0 ? '+' : ''}{m})</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-2 border-t border-border/40">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Jets de sauvegarde</div>
        <div className="grid grid-cols-2 gap-1">
          {ABILITIES.map((k) => {
            const prof = saveProfOf(ch, k);
            const total = mod(abilityOf(ch, k)) + (prof ? pb : 0);
            return (
              <label key={k} className="flex items-center gap-2 text-sm hover:bg-white/[0.02] rounded px-1">
                <input
                  type="checkbox"
                  checked={prof}
                  onChange={(e) => patch({ [`save_prof_${k}`]: e.target.checked } as Partial<DnDCharacter>)}
                  className="accent-gold"
                />
                <span className="flex-1">{ABILITY_LABELS[k]}</span>
                <span className="font-display text-gold">{total >= 0 ? `+${total}` : total}</span>
              </label>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

// ─── SKILLS ──────────────────────────────────────────────────────────────────

interface SkillsState {
  proficient: string[];
  expert: string[];
}

function readSkillsState(ch: DnDCharacter): SkillsState {
  const prof = ((ch as unknown as { _skillProf?: string[] })._skillProf ?? []) as string[];
  const exp = ((ch as unknown as { _skillExpert?: string[] })._skillExpert ?? []) as string[];
  return { proficient: prof, expert: exp };
}

export function SkillsPanel({ ch, patch }: PanelProps) {
  const state = readSkillsState(ch);
  const pb = profBonus(ch.level);

  const toggle = (set: 'proficient' | 'expert', skill: string) => {
    const current = state[set];
    const next = current.includes(skill) ? current.filter((s) => s !== skill) : [...current, skill];
    const key = set === 'proficient' ? '_skillProf' : '_skillExpert';
    patch({ [key]: next } as unknown as Partial<DnDCharacter>);
  };

  return (
    <Panel title="Compétences">
      <ul
        className="flex-1 min-h-0 overflow-y-auto"
        style={{ columnWidth: '220px', columnGap: '1rem' }}
      >
        {SKILLS.map((sk) => {
          const isProf = state.proficient.includes(sk.name);
          const isExp = state.expert.includes(sk.name);
          const base = mod(abilityOf(ch, sk.ability));
          const bonus = isExp ? pb * 2 : isProf ? pb : 0;
          const total = base + bonus;
          return (
            <li key={sk.name} className="grid grid-cols-[24px_24px_1fr_40px] gap-1 items-center hover:bg-white/[0.02] rounded px-1 break-inside-avoid">
              <input
                type="checkbox"
                checked={isProf}
                onChange={() => toggle('proficient', sk.name)}
                className="accent-gold"
              />
              <input
                type="checkbox"
                checked={isExp}
                onChange={() => toggle('expert', sk.name)}
                className="accent-gold"
                title="Expertise"
              />
              <span className="text-sm truncate">
                {sk.name} <span className="text-muted-foreground text-xs">({ABILITY_SHORT[sk.ability]})</span>
              </span>
              <span className="text-right font-display text-gold text-sm">
                {total >= 0 ? `+${total}` : total}
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

// ─── SPELLS ──────────────────────────────────────────────────────────────────

export function SpellsPanel({ ch, patch }: PanelProps) {
  const [browserOpen, setBrowserOpen] = useState(false);
  const { data: aoeMap } = useDndSpellsAoe();
  const slots = getSlots(ch._spellType, ch.level);
  const levels = Object.keys(slots).map(Number).sort((a, b) => a - b);

  const toggleSlot = (lvl: number, idx: number) => {
    const key = `${lvl}_${idx}`;
    patch({
      _slotUsed: {
        ...ch._slotUsed,
        [key]: !ch._slotUsed[key],
      },
    });
  };

  const addSpell = () => {
    const name = window.prompt('Nom du sort');
    if (!name) return;
    const lvlStr = window.prompt('Niveau (0 = cantrip, 1-9)', '0');
    const lvl = Math.max(0, Math.min(9, Number(lvlStr) || 0));
    const spell: DnDSpell = {
      prepared: true,
      level: lvl,
      school: 'Évocation',
      name,
      range: '',
      duration: '',
      v: false, s: false, m: false,
      summary: '',
      expanded: false,
    };
    patch({ _spells: [...ch._spells, spell] });
  };

  const delSpell = (i: number) => {
    patch({ _spells: ch._spells.filter((_, j) => j !== i) });
  };

  const updateSpell = (i: number, p: Partial<DnDSpell>) => {
    patch({ _spells: ch._spells.map((s, j) => (j === i ? { ...s, ...p } : s)) });
  };

  const byLevel = new Map<number, Array<[number, DnDSpell]>>();
  ch._spells.forEach((s, i) => {
    const bucket = byLevel.get(s.level) ?? [];
    bucket.push([i, s]);
    byLevel.set(s.level, bucket);
  });
  const orderedLevels = Array.from(byLevel.keys()).sort((a, b) => a - b);

  return (
    <Panel title="Sorts">
      <div className="flex gap-2 flex-wrap text-xs">
        <label className="flex items-center gap-1">
          Type
          <select
            value={ch._spellType}
            onChange={(e) => patch({ _spellType: e.target.value as DnDCharacter['_spellType'] })}
            className="bg-input border border-border/60 rounded px-1 py-0.5"
          >
            <option value="none">Aucun</option>
            <option value="full">Complet</option>
            <option value="half">Demi</option>
            <option value="third">Tiers</option>
            <option value="warlock">Warlock</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          Caract.
          <select
            value={ch._spellAbility}
            onChange={(e) => patch({ _spellAbility: e.target.value as AbilityKey })}
            className="bg-input border border-border/60 rounded px-1 py-0.5"
          >
            {ABILITIES.map((a) => <option key={a} value={a}>{ABILITY_SHORT[a]}</option>)}
          </select>
        </label>
        <span className="ml-auto text-muted-foreground">
          DC <b className="text-gold">{ch.spell_dc}</b> · Attaque <b className="text-gold">+{ch.spell_attack}</b>
        </span>
      </div>

      {levels.length > 0 && (
        <div className="space-y-1">
          {levels.map((lvl) => (
            <div key={lvl} className="flex items-center gap-2">
              <span className="w-16 text-xs uppercase tracking-wider text-muted-foreground">Niv {lvl}</span>
              <div className="flex gap-1">
                {Array.from({ length: slots[lvl] }).map((_, i) => {
                  const used = ch._slotUsed[`${lvl}_${i}`];
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleSlot(lvl, i)}
                      className={cn(
                        'w-4 h-4 rounded-full border',
                        used ? 'bg-muted border-muted-foreground/40' : 'bg-gold border-gold shadow-[0_0_4px_rgba(201,168,76,0.6)]',
                      )}
                      title={used ? 'Utilisé — cliquer pour restaurer' : 'Disponible'}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        className="flex-1 min-h-0 overflow-y-auto pt-2 border-t border-border/40"
        style={{ columnWidth: '280px', columnGap: '0.75rem' }}
      >
        {orderedLevels.length === 0 ? (
          <p className="text-xs italic text-muted-foreground text-center py-2">
            Aucun sort ajouté.
          </p>
        ) : orderedLevels.map((lvl) => (
          <div key={lvl} className="break-inside-avoid mb-1">
            <div className="text-[10px] uppercase tracking-wider text-gold/80 py-1">
              {lvl === 0 ? 'Cantrips' : `Niveau ${lvl}`}
            </div>
            {byLevel.get(lvl)!.map(([i, s]) => (
              <SpellRow
                key={i}
                spell={s}
                characterLevel={ch.level}
                aoeMap={aoeMap}
                onUpdate={(p) => updateSpell(i, p)}
                onDelete={() => delSpell(i)}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="flex gap-1">
        <button type="button" onClick={() => setBrowserOpen(true)} className="btn-rune flex-1 text-xs">
          <BookOpen className="w-3 h-3" /> Bibliothèque
        </button>
        <button type="button" onClick={addSpell} className="btn-rune text-xs px-2" title="Ajouter manuellement">
          <Plus className="w-3 h-3" />
        </button>
      </div>
      <SpellBrowser
        open={browserOpen}
        onClose={() => setBrowserOpen(false)}
        existingNames={new Set(ch._spells.map((s) => s.name))}
        onPick={(spell) => patch({ _spells: [...ch._spells, spell] })}
      />
    </Panel>
  );
}

function SpellRow({
  spell,
  characterLevel,
  aoeMap,
  onUpdate,
  onDelete,
}: {
  spell: DnDSpell;
  characterLevel?: number;
  aoeMap?: Record<string, import('@/types/dnd').SpellAreaOfEffect>;
  onUpdate: (p: Partial<DnDSpell>) => void;
  onDelete: () => void;
}) {
  const s = spell;
  const hasDetail = !!(s.summary || s.range || s.duration || s.school || s.casting_time || s.higher_level);

  return (
    <div className="border-b border-border/10 last:border-b-0">
      <div className="flex items-center gap-1 text-sm hover:bg-white/[0.02] rounded px-1">
        <button
          type="button"
          onClick={() => hasDetail && onUpdate({ expanded: !s.expanded })}
          className={cn('text-muted-foreground hover:text-gold', !hasDetail && 'opacity-30 cursor-default')}
          title={hasDetail ? (s.expanded ? 'Replier' : 'Déplier') : 'Pas de détails'}
        >
          {s.expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        <input
          type="checkbox"
          checked={s.prepared}
          onChange={(e) => onUpdate({ prepared: e.target.checked })}
          className="accent-gold"
          title="Préparé"
        />
        <input
          type="text"
          value={s.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="flex-1 bg-transparent focus:bg-input border-b border-transparent focus:border-gold/60 px-1 focus:outline-none"
        />
        <button type="button" onClick={onDelete} className="text-blood hover:text-blood-light" title="Retirer">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {s.expanded && (
        <div className="ml-6 mr-1 mb-2 mt-1 rounded bg-night-deep/50 border border-border/40 p-3">
          <SpellCard spell={s} characterLevel={characterLevel} aoeMap={aoeMap} />
        </div>
      )}
    </div>
  );
}

// ─── MONEY + EQUIPMENT ───────────────────────────────────────────────────────

export function WealthPanel({ ch, patch }: PanelProps) {
  return (
    <Panel title="Trésor">
      <div className="grid grid-cols-5 gap-2">
        {(['cp', 'sp', 'ep', 'gp', 'pp'] as const).map((k) => (
          <NumField
            key={k}
            label={k.toUpperCase()}
            value={ch[k] as number}
            onChange={(v) => patch({ [k]: v } as Partial<DnDCharacter>)}
          />
        ))}
      </div>
    </Panel>
  );
}

export function EquipmentPanel({ ch, patch }: PanelProps) {
  const add = () => {
    const name = window.prompt('Objet');
    if (!name) return;
    patch({ _equipment: [...ch._equipment, { name, qty: 1 }] });
  };
  const remove = (i: number) => patch({ _equipment: ch._equipment.filter((_, j) => j !== i) });
  const update = (i: number, p: Partial<{ name: string; qty: number; notes: string }>) =>
    patch({ _equipment: ch._equipment.map((e, j) => (j === i ? { ...e, ...p } : e)) });

  return (
    <Panel title="Équipement">
      <div
        className="flex-1 min-h-0 overflow-y-auto"
        style={{ columnWidth: '240px', columnGap: '0.75rem' }}
      >
        {ch._equipment.length === 0 ? (
          <p className="text-xs italic text-muted-foreground text-center py-2">Aucun objet.</p>
        ) : ch._equipment.map((e, i) => (
          <div key={i} className="flex items-center gap-2 text-sm break-inside-avoid mb-1">
            <input
              type="number"
              value={e.qty ?? 1}
              onChange={(ev) => update(i, { qty: Number(ev.target.value) || 1 })}
              className="w-12 bg-input border border-border/60 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-gold"
            />
            <input
              type="text"
              value={e.name}
              onChange={(ev) => update(i, { name: ev.target.value })}
              className="flex-1 bg-transparent focus:bg-input border-b border-transparent focus:border-gold/60 px-1 py-0.5 focus:outline-none"
            />
            <button type="button" onClick={() => remove(i)} className="text-blood hover:text-blood-light">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={add} className="btn-rune w-full text-xs">
        <Plus className="w-3 h-3" /> Ajouter
      </button>
    </Panel>
  );
}

// ─── FEATURES & PERSONALITY ──────────────────────────────────────────────────

export function FeaturesPanel({ ch, patch }: PanelProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const remove = (i: number) => patch({ _features: ch._features.filter((_, j) => j !== i) });
  const update = (i: number, p: Partial<{ name: string; source: string; description: string }>) =>
    patch({ _features: ch._features.map((f, j) => (j === i ? { ...f, ...p } : f)) });

  return (
    <Panel title="Aptitudes & Traits">
      <div
        className="flex-1 min-h-0 overflow-y-auto"
        style={{ columnWidth: '280px', columnGap: '0.75rem' }}
      >
        {ch._features.length === 0 ? (
          <p className="text-xs italic text-muted-foreground text-center py-2">Aucune aptitude.</p>
        ) : ch._features.map((f, i) => (
          <div key={i} className="space-y-1 bg-night-deep/40 rounded p-2 break-inside-avoid mb-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={f.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder="Nom"
                className="flex-1 bg-transparent focus:bg-input border-b border-transparent focus:border-gold/60 px-1 font-display text-gold focus:outline-none"
              />
              <input
                type="text"
                value={f.source}
                onChange={(e) => update(i, { source: e.target.value })}
                placeholder="Source"
                className="w-32 bg-transparent focus:bg-input border-b border-transparent focus:border-gold/60 px-1 text-xs focus:outline-none"
              />
              <button type="button" onClick={() => remove(i)} className="text-blood">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <textarea
              value={f.description}
              onChange={(e) => update(i, { description: e.target.value })}
              placeholder="Description"
              rows={2}
              className="w-full bg-input border border-border/60 rounded px-2 py-1 text-xs resize-y focus:outline-none focus:border-gold"
            />
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setModalOpen(true)} className="btn-rune w-full text-xs">
        <Plus className="w-3 h-3" /> Ajouter
      </button>
      <FeaturesModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        existing={ch._features}
        classId={ch._classId}
        className={ch._className}
        level={ch.level}
        onAdd={(additions) => patch({ _features: [...ch._features, ...additions] })}
      />
    </Panel>
  );
}

// ─── RESOURCES (rage uses, ki points, channel divinity, etc.) ────────────────

const RECHARGE_LABELS: Record<ResourceRecharge, string> = {
  short: 'Court repos',
  long: 'Long repos',
  none: 'Manuel',
};

export function ResourcesPanel({ ch, patch }: PanelProps) {
  const add = () => patch({ _resources: [...ch._resources, blankResource()] });
  const remove = (id: string) => patch({ _resources: ch._resources.filter((r) => r.id !== id) });
  const update = (id: string, p: Partial<DnDResource>) =>
    patch({ _resources: ch._resources.map((r) => (r.id === id ? { ...r, ...p } : r)) });

  const tick = (r: DnDResource) => {
    if (r.current <= 0) return;
    update(r.id, { current: r.current - 1 });
  };
  const untick = (r: DnDResource) => {
    if (r.current >= r.max) return;
    update(r.id, { current: r.current + 1 });
  };

  return (
    <Panel title="Ressources">
      <div
        className="flex-1 min-h-0 overflow-y-auto"
        style={{ columnWidth: '260px', columnGap: '0.75rem' }}
      >
        {ch._resources.length === 0 ? (
          <p className="text-xs italic text-muted-foreground text-center py-2">
            Aucune ressource. Ajoute-en une pour les usages limités (Rage, Ki, Chancellerie divine…).
          </p>
        ) : ch._resources.map((r) => (
          <div key={r.id} className="bg-night-deep/40 rounded p-2 space-y-1 break-inside-avoid mb-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={r.name}
                onChange={(e) => update(r.id, { name: e.target.value })}
                placeholder="Nom (ex: Rage)"
                className="flex-1 bg-transparent focus:bg-input border-b border-transparent focus:border-gold/60 px-1 font-display text-gold focus:outline-none"
              />
              <select
                value={r.recharge}
                onChange={(e) => update(r.id, { recharge: e.target.value as ResourceRecharge })}
                className="bg-input border border-border/60 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-gold"
                title="Récupération"
              >
                <option value="short">Court repos</option>
                <option value="long">Long repos</option>
                <option value="none">Manuel</option>
              </select>
              <button type="button" onClick={() => remove(r.id)} className="text-blood">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="flex gap-1 flex-1 flex-wrap">
                {Array.from({ length: r.max }).map((_, i) => {
                  const used = i >= r.current;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => (used ? untick(r) : tick(r))}
                      className={cn(
                        'w-4 h-4 rounded-sm border',
                        used
                          ? 'bg-muted border-muted-foreground/40'
                          : 'bg-gold border-gold shadow-[0_0_4px_rgba(201,168,76,0.6)]',
                      )}
                      title={used ? 'Utilisé — clic pour restaurer' : 'Disponible — clic pour consommer'}
                    />
                  );
                })}
              </div>
              <span className="text-xs text-muted-foreground">
                {r.current}/
                <input
                  type="number"
                  value={r.max}
                  min={1}
                  max={99}
                  onChange={(e) =>
                    update(r.id, {
                      max: Math.max(1, Number(e.target.value) || 1),
                      current: Math.min(r.current, Math.max(1, Number(e.target.value) || 1)),
                    })
                  }
                  className="w-10 bg-input border border-border/60 rounded px-1 text-xs ml-1 focus:outline-none focus:border-gold"
                />
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground italic">
              Récup. : {RECHARGE_LABELS[r.recharge]}
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={add} className="btn-rune w-full text-xs">
        <Plus className="w-3 h-3" /> Ajouter une ressource
      </button>
    </Panel>
  );
}

export function PersonalityPanel({ ch, patch }: PanelProps) {
  const area = (k: keyof DnDCharacter, label: string) => (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <textarea
        value={String(ch[k] ?? '')}
        onChange={(e) => patch({ [k]: e.target.value } as Partial<DnDCharacter>)}
        rows={2}
        className="w-full bg-input border border-border/60 rounded px-2 py-1 text-sm resize-y focus:outline-none focus:border-gold"
      />
    </label>
  );
  return (
    <Panel title="Personnalité">
      {area('_traits', 'Traits de personnalité')}
      {area('_ideals', 'Idéaux')}
      {area('_bonds', 'Liens')}
      {area('_flaws', 'Défauts')}
      {area('_backstory', 'Histoire')}
      {area('_notes', 'Notes')}
    </Panel>
  );
}

// ─── DEATH SAVES ─────────────────────────────────────────────────────────────

export function DeathSavesPanel({ ch, patch }: PanelProps) {
  const ds = ch._deathSaves;
  const toggle = (kind: 'successes' | 'failures', i: number) => {
    const next = [...ds[kind]];
    next[i] = !next[i];
    patch({ _deathSaves: { ...ds, [kind]: next } });
  };
  const reset = () =>
    patch({ _deathSaves: { successes: [false, false, false], failures: [false, false, false] } });

  return (
    <Panel title="Jets de sauvegarde contre la mort">
      <div className="flex items-center gap-3">
        <span className="w-20 text-xs uppercase tracking-wider text-emerald-400">Réussites</span>
        {ds.successes.map((v, i) => (
          <button
            key={i}
            type="button"
            onClick={() => toggle('successes', i)}
            className={cn(
              'w-5 h-5 rounded-full border-2',
              v ? 'bg-emerald-400 border-emerald-400' : 'border-emerald-400/50',
            )}
          />
        ))}
      </div>
      <div className="flex items-center gap-3">
        <span className="w-20 text-xs uppercase tracking-wider text-blood">Échecs</span>
        {ds.failures.map((v, i) => (
          <button
            key={i}
            type="button"
            onClick={() => toggle('failures', i)}
            className={cn(
              'w-5 h-5 rounded-full border-2',
              v ? 'bg-blood border-blood' : 'border-blood/60',
            )}
          />
        ))}
      </div>
      <button type="button" onClick={reset} className="btn-rune w-full text-xs">Reset</button>
    </Panel>
  );
}
