/**
 * Full-screen modal to author or edit a custom monster. SRD monsters are
 * refused at the door — callers must clone them first (see MJScreen).
 *
 * The draft is held in local state; StatBlock renders a live preview on the
 * right while the form on the left mutates the draft. On save we persist via
 * useCustomMonstersDb (keyed by slug) and optionally forward the full Monster
 * to the caller so it can add the fresh record to an encounter.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Monster } from '@/types/monster';
import { StatBlock } from './StatBlock';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Plus, Trash2, X } from 'lucide-react';

interface Props {
  open: boolean;
  initial?: Monster | null;
  onClose: () => void;
  onSave: (monster: Monster) => void | Promise<void>;
}

// --- shared tokens -------------------------------------------------------

const ABILITIES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const;
type Ability = (typeof ABILITIES)[number];

const ABILITY_LABEL: Record<Ability, string> = {
  strength: 'FOR',
  dexterity: 'DEX',
  constitution: 'CON',
  intelligence: 'INT',
  wisdom: 'SAG',
  charisma: 'CHA',
};

const DMG_TYPES = [
  'bludgeoning', 'piercing', 'slashing', 'fire', 'cold', 'lightning',
  'thunder', 'acid', 'poison', 'necrotic', 'radiant', 'force', 'psychic',
] as const;

const DMG_FR: Record<string, string> = {
  bludgeoning: 'Contondant', piercing: 'Perforant', slashing: 'Tranchant',
  fire: 'Feu', cold: 'Froid', lightning: 'Foudre', thunder: 'Tonnerre',
  acid: 'Acide', poison: 'Poison', necrotic: 'Nécrotique', radiant: 'Radiant',
  force: 'Force', psychic: 'Psychique',
};

const SPEED_KEYS: Array<{ key: string; label: string }> = [
  { key: 'walk', label: 'Marche' },
  { key: 'fly', label: 'Vol' },
  { key: 'swim', label: 'Nage' },
  { key: 'burrow', label: 'Creuser' },
  { key: 'climb', label: 'Grimper' },
];

const CR_VALUES = [
  '0', '1/8', '1/4', '1/2',
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
  '21', '22', '23', '24', '25', '26', '27', '28', '29', '30',
];

const CR_TO_XP: Record<string, number> = {
  '0': 10, '1/8': 25, '1/4': 50, '1/2': 100,
  '1': 200, '2': 450, '3': 700, '4': 1100, '5': 1800, '6': 2300,
  '7': 2900, '8': 3900, '9': 5000, '10': 5900, '11': 7200, '12': 8400,
  '13': 10000, '14': 11500, '15': 13000, '16': 15000, '17': 18000, '18': 20000,
  '19': 22000, '20': 25000, '21': 33000, '22': 41000, '23': 50000, '24': 62000,
  '25': 75000, '26': 90000, '27': 105000, '28': 120000, '29': 135000, '30': 155000,
};

function crToPb(cr: string): number {
  const n = cr.includes('/') ? 0 : Number(cr);
  if (n >= 29) return 9;
  if (n >= 25) return 8;
  if (n >= 21) return 7;
  if (n >= 17) return 6;
  if (n >= 13) return 5;
  if (n >= 9) return 4;
  if (n >= 5) return 3;
  return 2;
}

// --- structured action types --------------------------------------------

type DamageEntry = {
  damage_dice?: string;
  damage_type?: { index?: string; name?: string } | string;
};

type DcEntry = {
  dc_type?: { name?: string };
  dc_value?: number;
  success_type?: 'half' | 'none';
};

type UsageEntry =
  | { type: 'recharge on roll'; min_value: number }
  | { type: 'per day'; times: number };

type ActionLike = {
  name: string;
  description: string;
  attack_bonus?: number;
  damage?: DamageEntry[];
  dc?: DcEntry;
  usage?: UsageEntry;
};

// --- draft shape --------------------------------------------------------

type SavesMap = Record<string, number>;
type SkillsMap = Record<string, number>;

type Draft = {
  slug?: string;
  name: string;
  type: string;
  size: string;
  alignment: string;

  armor_class_value: string;
  armor_desc: string;
  hit_points_value: string;
  hit_dice: string;
  speed: Record<string, number>;

  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;

  saves: Array<{ ability: string; bonus: number }>;
  skills: Array<{ ability: string; bonus: number }>;

  damage_resistances: string[];
  damage_immunities: string[];
  damage_vulnerabilities: string[];
  condition_immunities: string[];

  senses: string;
  languages: string;

  cr: string;
  xp: number;
  proficiency_bonus: number;

  traits: ActionLike[];
  actions: ActionLike[];
  reactions: ActionLike[];
  legendary_actions: ActionLike[];
  legendary_description: string;

  notes: string;
};

const BLANK: Draft = {
  name: '',
  type: '',
  size: 'Medium',
  alignment: '',
  armor_class_value: '12',
  armor_desc: '',
  hit_points_value: '10',
  hit_dice: '',
  speed: { walk: 9, fly: 0, swim: 0, burrow: 0, climb: 0 },
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
  saves: [],
  skills: [],
  damage_resistances: [],
  damage_immunities: [],
  damage_vulnerabilities: [],
  condition_immunities: [],
  senses: '',
  languages: '',
  cr: '0',
  xp: CR_TO_XP['0'],
  proficiency_bonus: 2,
  traits: [],
  actions: [],
  reactions: [],
  legendary_actions: [],
  legendary_description: '',
  notes: '',
};

// --- import / export helpers -------------------------------------------

function asNum(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const m = v.match(/-?\d+(\.\d+)?/);
    if (m) return Number(m[0]);
  }
  return fallback;
}

function normalizeList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
  if (typeof v === 'string') {
    return v.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function monsterToDraft(m: Monster): Draft {
  const speed: Record<string, number> = { walk: 0, fly: 0, swim: 0, burrow: 0, climb: 0 };
  if (m.speed && typeof m.speed === 'object' && !Array.isArray(m.speed)) {
    for (const [k, v] of Object.entries(m.speed as Record<string, unknown>)) {
      speed[k] = asNum(v);
    }
  } else if (typeof m.speed === 'string') {
    const walk = m.speed.match(/\d+/);
    if (walk) speed.walk = Number(walk[0]);
  }

  const savesArr: Array<{ ability: string; bonus: number }> = [];
  if (m.saves && typeof m.saves === 'object') {
    for (const [k, v] of Object.entries(m.saves as Record<string, unknown>)) {
      savesArr.push({ ability: k, bonus: asNum(v) });
    }
  }

  const skillsArr: Array<{ ability: string; bonus: number }> = [];
  if (m.skills && typeof m.skills === 'object') {
    for (const [k, v] of Object.entries(m.skills as Record<string, unknown>)) {
      skillsArr.push({ ability: k, bonus: asNum(v) });
    }
  }

  const ac = Array.isArray(m.armor_class)
    ? m.armor_class[0]
    : m.armor_class;
  const acValue = typeof ac === 'object' && ac
    ? String((ac as { value?: unknown }).value ?? '')
    : String(ac ?? '');
  const acDesc = Array.isArray(m.armor_class) && m.armor_class[0]
    ? String((m.armor_class[0] as { type?: string }).type ?? '')
    : '';

  const crRaw = m.challenge_rating ?? m.cr ?? '0';
  const cr = String(crRaw);

  return {
    slug: m.slug,
    name: m.name ?? '',
    type: m.type ?? '',
    size: m.size ?? 'Medium',
    alignment: m.alignment ?? '',
    armor_class_value: acValue,
    armor_desc: acDesc,
    hit_points_value: String(m.hit_points ?? ''),
    hit_dice: m.hit_dice ?? '',
    speed,
    strength: m.strength ?? 10,
    dexterity: m.dexterity ?? 10,
    constitution: m.constitution ?? 10,
    intelligence: m.intelligence ?? 10,
    wisdom: m.wisdom ?? 10,
    charisma: m.charisma ?? 10,
    saves: savesArr,
    skills: skillsArr,
    damage_resistances: normalizeList(m.damage_resistances),
    damage_immunities: normalizeList(m.damage_immunities),
    damage_vulnerabilities: normalizeList(m.damage_vulnerabilities),
    condition_immunities: normalizeList(m.condition_immunities),
    senses: typeof m.senses === 'string' ? m.senses : '',
    languages: typeof m.languages === 'string' ? m.languages : '',
    cr,
    xp: typeof m.xp === 'number' ? m.xp : (CR_TO_XP[cr] ?? 0),
    proficiency_bonus: typeof m.proficiency_bonus === 'number'
      ? m.proficiency_bonus
      : asNum(m.proficiency_bonus, crToPb(cr)),
    traits: (m.traits as ActionLike[] | undefined) ?? [],
    actions: (m.actions as ActionLike[] | undefined) ?? [],
    reactions: (m.reactions as ActionLike[] | undefined) ?? [],
    legendary_actions: (m.legendary_actions as ActionLike[] | undefined) ?? [],
    legendary_description: m.legendary_description ?? '',
    notes: m.notes ?? '',
  };
}

function draftToMonster(d: Draft): Monster {
  const savesObj: SavesMap = {};
  for (const s of d.saves) if (s.ability) savesObj[s.ability] = s.bonus;
  const skillsObj: SkillsMap = {};
  for (const s of d.skills) if (s.ability) skillsObj[s.ability] = s.bonus;

  const speed: Record<string, number> = {};
  for (const [k, v] of Object.entries(d.speed)) {
    if (v > 0) speed[k] = v;
  }

  const acNum = Number(d.armor_class_value);
  const armor_class = d.armor_desc
    ? [{ type: d.armor_desc, value: Number.isFinite(acNum) ? acNum : 10 }]
    : Number.isFinite(acNum) ? acNum : d.armor_class_value;

  const hpNum = Number(d.hit_points_value);

  return {
    slug: d.slug,
    name: d.name.trim() || 'Nouveau monstre',
    type: d.type || undefined,
    size: d.size || undefined,
    alignment: d.alignment || undefined,
    armor_class,
    hit_points: Number.isFinite(hpNum) ? hpNum : d.hit_points_value,
    hit_dice: d.hit_dice || undefined,
    speed: Object.keys(speed).length ? speed : undefined,
    strength: d.strength,
    dexterity: d.dexterity,
    constitution: d.constitution,
    intelligence: d.intelligence,
    wisdom: d.wisdom,
    charisma: d.charisma,
    saves: Object.keys(savesObj).length ? savesObj : undefined,
    skills: Object.keys(skillsObj).length ? skillsObj : undefined,
    damage_resistances: d.damage_resistances.length ? d.damage_resistances : undefined,
    damage_immunities: d.damage_immunities.length ? d.damage_immunities : undefined,
    damage_vulnerabilities: d.damage_vulnerabilities.length ? d.damage_vulnerabilities : undefined,
    condition_immunities: d.condition_immunities.length ? d.condition_immunities : undefined,
    senses: d.senses || undefined,
    languages: d.languages || undefined,
    cr: d.cr,
    challenge_rating: d.cr,
    xp: d.xp,
    proficiency_bonus: d.proficiency_bonus,
    traits: d.traits.length ? d.traits : undefined,
    actions: d.actions.length ? d.actions : undefined,
    reactions: d.reactions.length ? d.reactions : undefined,
    legendary_actions: d.legendary_actions.length ? d.legendary_actions : undefined,
    legendary_description: d.legendary_description || undefined,
    notes: d.notes || undefined,
    source: 'custom',
  };
}

// --- shared small UI pieces --------------------------------------------

const DICE_RE = /^\d+d\d+([+-]\d+)?$/i;

function Section({
  title, open, onToggle, children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="panel p-3">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 font-display uppercase tracking-wider text-sm text-gold"
      >
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        {title}
      </button>
      {open && <div className="mt-3 space-y-2">{children}</div>}
    </section>
  );
}

function Field({
  label, children, hint,
}: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="uppercase tracking-wider text-parchment/70">{label}</span>
      {children}
      {hint && <span className="text-[10px] text-muted-foreground italic">{hint}</span>}
    </label>
  );
}

const inputCls = 'bg-input border border-border/60 rounded px-2 py-1 text-sm focus:outline-none focus:border-gold';

function TagEditor({
  values, onChange, placeholder,
}: { values: string[]; onChange: (next: string[]) => void; placeholder: string }) {
  const [pending, setPending] = useState('');
  const add = () => {
    const v = pending.trim();
    if (!v) return;
    onChange([...values, v]);
    setPending('');
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {values.map((v, i) => (
        <span key={`${v}-${i}`} className="inline-flex items-center gap-1 bg-night-deep/60 border border-border/60 rounded px-2 py-0.5 text-xs">
          {v}
          <button
            type="button"
            onClick={() => onChange(values.filter((_, j) => j !== i))}
            className="text-blood hover:text-blood-light"
            title="Retirer"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={pending}
          onChange={(e) => setPending(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); add(); }
          }}
          placeholder={placeholder}
          className={cn(inputCls, 'w-40')}
        />
        <button type="button" onClick={add} className="btn-rune text-[10px] px-2 py-1">
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function AbilityBonusRows({
  rows, onChange, placeholder,
}: {
  rows: Array<{ ability: string; bonus: number }>;
  onChange: (next: Array<{ ability: string; bonus: number }>) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-1">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="text"
            value={row.ability}
            onChange={(e) => {
              const next = rows.slice();
              next[i] = { ...row, ability: e.target.value };
              onChange(next);
            }}
            placeholder={placeholder}
            className={cn(inputCls, 'flex-1')}
          />
          <input
            type="number"
            value={row.bonus}
            onChange={(e) => {
              const next = rows.slice();
              next[i] = { ...row, bonus: Number(e.target.value) || 0 };
              onChange(next);
            }}
            className={cn(inputCls, 'w-20')}
          />
          <button
            type="button"
            onClick={() => onChange(rows.filter((_, j) => j !== i))}
            className="text-blood hover:text-blood-light"
            title="Retirer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, { ability: '', bonus: 0 }])}
        className="btn-rune text-[10px] px-2 py-1"
      >
        <Plus className="w-3 h-3" /> Ajouter
      </button>
    </div>
  );
}

// --- structured action editor ------------------------------------------

function DamageRow({
  damage, onChange, onRemove,
}: {
  damage: DamageEntry;
  onChange: (next: DamageEntry) => void;
  onRemove: () => void;
}) {
  const dice = damage.damage_dice ?? '';
  const valid = !dice || DICE_RE.test(dice);
  const type = typeof damage.damage_type === 'string'
    ? damage.damage_type
    : damage.damage_type?.index ?? '';
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={dice}
        onChange={(e) => onChange({ ...damage, damage_dice: e.target.value })}
        placeholder="ex. 2d6+3"
        className={cn(inputCls, 'w-28', !valid && 'border-blood')}
      />
      <select
        value={type}
        onChange={(e) => onChange({
          ...damage,
          damage_type: { index: e.target.value, name: DMG_FR[e.target.value] ?? e.target.value },
        })}
        className={cn(inputCls, 'flex-1')}
      >
        <option value="">Type…</option>
        {DMG_TYPES.map((k) => (
          <option key={k} value={k}>{DMG_FR[k] ?? k}</option>
        ))}
      </select>
      <button type="button" onClick={onRemove} className="text-blood hover:text-blood-light" title="Retirer">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function ActionEditor({
  entry, onChange, onRemove,
}: {
  entry: ActionLike;
  onChange: (next: ActionLike) => void;
  onRemove: () => void;
}) {
  const dcAbility = entry.dc?.dc_type?.name ?? '';
  return (
    <div className="panel p-2 space-y-2 bg-night-deep/40">
      <div className="flex items-start gap-2">
        <input
          type="text"
          value={entry.name}
          onChange={(e) => onChange({ ...entry, name: e.target.value })}
          placeholder="Nom (ex. Morsure)"
          className={cn(inputCls, 'flex-1')}
        />
        <button type="button" onClick={onRemove} className="text-blood hover:text-blood-light" title="Supprimer">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <textarea
        value={entry.description}
        onChange={(e) => onChange({ ...entry, description: e.target.value })}
        placeholder="Description…"
        className={cn(inputCls, 'w-full min-h-16 resize-none')}
      />

      <div className="grid grid-cols-2 gap-2">
        <Field label="Bonus de toucher">
          <input
            type="number"
            value={entry.attack_bonus ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              onChange({ ...entry, attack_bonus: v === '' ? undefined : Number(v) });
            }}
            placeholder="—"
            className={inputCls}
          />
        </Field>
        <Field label="Récurrence">
          <select
            value={entry.usage?.type ?? ''}
            onChange={(e) => {
              const t = e.target.value;
              if (t === 'recharge on roll') onChange({ ...entry, usage: { type: 'recharge on roll', min_value: 5 } });
              else if (t === 'per day') onChange({ ...entry, usage: { type: 'per day', times: 1 } });
              else onChange({ ...entry, usage: undefined });
            }}
            className={inputCls}
          >
            <option value="">Aucune</option>
            <option value="recharge on roll">Recharge sur jet</option>
            <option value="per day">Par jour</option>
          </select>
        </Field>
      </div>

      {entry.usage?.type === 'recharge on roll' && (
        <Field label="Valeur min. (recharge X–6)">
          <input
            type="number"
            min={2}
            max={6}
            value={entry.usage.min_value}
            onChange={(e) => onChange({
              ...entry,
              usage: { type: 'recharge on roll', min_value: Number(e.target.value) || 5 },
            })}
            className={cn(inputCls, 'w-20')}
          />
        </Field>
      )}
      {entry.usage?.type === 'per day' && (
        <Field label="Nombre de fois / jour">
          <input
            type="number"
            min={1}
            value={entry.usage.times}
            onChange={(e) => onChange({
              ...entry,
              usage: { type: 'per day', times: Number(e.target.value) || 1 },
            })}
            className={cn(inputCls, 'w-20')}
          />
        </Field>
      )}

      <div>
        <div className="text-xs uppercase tracking-wider text-parchment/70 mb-1">Dégâts</div>
        <div className="space-y-1">
          {(entry.damage ?? []).map((d, i) => (
            <DamageRow
              key={i}
              damage={d}
              onChange={(next) => {
                const arr = (entry.damage ?? []).slice();
                arr[i] = next;
                onChange({ ...entry, damage: arr });
              }}
              onRemove={() => {
                const arr = (entry.damage ?? []).filter((_, j) => j !== i);
                onChange({ ...entry, damage: arr.length ? arr : undefined });
              }}
            />
          ))}
          <button
            type="button"
            onClick={() => onChange({ ...entry, damage: [...(entry.damage ?? []), {}] })}
            className="btn-rune text-[10px] px-2 py-1"
          >
            <Plus className="w-3 h-3" /> Dégâts
          </button>
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-parchment/70 mb-1">Jet de sauvegarde</div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={dcAbility}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) { onChange({ ...entry, dc: undefined }); return; }
              onChange({ ...entry, dc: { ...(entry.dc ?? {}), dc_type: { name: v } } });
            }}
            className={inputCls}
          >
            <option value="">—</option>
            {ABILITIES.map((a) => (
              <option key={a} value={ABILITY_LABEL[a]}>{ABILITY_LABEL[a]}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="DD"
            value={entry.dc?.dc_value ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              onChange({
                ...entry,
                dc: { ...(entry.dc ?? {}), dc_value: v === '' ? undefined : Number(v) },
              });
            }}
            className={cn(inputCls, 'w-20')}
            disabled={!dcAbility}
          />
          {dcAbility && (
            <div className="flex items-center gap-3 text-xs">
              {(['half', 'none'] as const).map((st) => (
                <label key={st} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name={`success-${entry.name}-${dcAbility}`}
                    checked={entry.dc?.success_type === st}
                    onChange={() => onChange({
                      ...entry,
                      dc: { ...(entry.dc ?? {}), success_type: st },
                    })}
                  />
                  {st === 'half' ? 'Succès = ½' : 'Succès = aucun'}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionList({
  title, entries, onChange,
}: {
  title: string;
  entries: ActionLike[];
  onChange: (next: ActionLike[]) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-parchment/70">{title}</span>
        <button
          type="button"
          onClick={() => onChange([...entries, { name: '', description: '' }])}
          className="btn-rune text-[10px] px-2 py-1"
        >
          <Plus className="w-3 h-3" /> Ajouter
        </button>
      </div>
      {entries.length === 0 && (
        <p className="text-xs italic text-muted-foreground">Aucune entrée.</p>
      )}
      {entries.map((e, i) => (
        <ActionEditor
          key={i}
          entry={e}
          onChange={(next) => {
            const arr = entries.slice();
            arr[i] = next;
            onChange(arr);
          }}
          onRemove={() => onChange(entries.filter((_, j) => j !== i))}
        />
      ))}
    </div>
  );
}

// --- main component -----------------------------------------------------

export function MonsterEditor({ open, initial, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<Draft>(BLANK);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    identity: true,
    combat: true,
    stats: true,
    defenses: false,
    senses: false,
    challenge: false,
    traits: false,
    actions: true,
    reactions: false,
    legendary: false,
    notes: false,
  });

  useEffect(() => {
    if (!open) return;
    setDraft(initial ? monsterToDraft(initial) : BLANK);
  }, [open, initial]);

  const toggle = useCallback((k: string) => {
    setOpenSections((prev) => ({ ...prev, [k]: !prev[k] }));
  }, []);

  const preview = useMemo(() => draftToMonster(draft), [draft]);

  const update = useCallback(<K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const onCrChange = useCallback((value: string) => {
    setDraft((prev) => ({
      ...prev,
      cr: value,
      xp: CR_TO_XP[value] ?? prev.xp,
      proficiency_bonus: crToPb(value),
    }));
  }, []);

  const handleSave = useCallback(async () => {
    await onSave(preview);
    onClose();
  }, [onClose, onSave, preview]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-stretch justify-center p-3">
      <div className="panel flex flex-col w-full max-w-7xl max-h-full overflow-hidden">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border/60 bg-night-deep/80">
          <h2 className="heading-rune text-xl flex-1">
            {initial?.slug ? '✎ Éditer le monstre' : '✦ Nouveau monstre'}
          </h2>
          <button type="button" onClick={onClose} className="btn-rune text-xs">
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn-rune text-xs bg-gold/15 border-gold text-gold"
            disabled={!draft.name.trim()}
          >
            Enregistrer
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] flex-1 overflow-hidden">
          <div className="overflow-y-auto p-4 space-y-3">
            <Section title="Identité" open={openSections.identity} onToggle={() => toggle('identity')}>
              <Field label="Nom *">
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => update('name', e.target.value)}
                  className={inputCls}
                  placeholder="ex. Gobelin sanglant"
                />
              </Field>
              <Field label="Type" hint="ex. Petite créature humanoïde (goblinoïde)">
                <input
                  type="text"
                  value={draft.type}
                  onChange={(e) => update('type', e.target.value)}
                  className={inputCls}
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Taille">
                  <select value={draft.size} onChange={(e) => update('size', e.target.value)} className={inputCls}>
                    {['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Alignement">
                  <input
                    type="text"
                    value={draft.alignment}
                    onChange={(e) => update('alignment', e.target.value)}
                    className={inputCls}
                    placeholder="ex. neutre mauvais"
                  />
                </Field>
              </div>
            </Section>

            <Section title="Combat" open={openSections.combat} onToggle={() => toggle('combat')}>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Classe d'armure">
                  <input
                    type="number"
                    value={draft.armor_class_value}
                    onChange={(e) => update('armor_class_value', e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Description CA" hint="ex. armure de cuir">
                  <input
                    type="text"
                    value={draft.armor_desc}
                    onChange={(e) => update('armor_desc', e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Points de vie">
                  <input
                    type="number"
                    value={draft.hit_points_value}
                    onChange={(e) => update('hit_points_value', e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Dés de vie" hint="ex. 2d6+2">
                  <input
                    type="text"
                    value={draft.hit_dice}
                    onChange={(e) => update('hit_dice', e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {SPEED_KEYS.map(({ key, label }) => (
                  <Field key={key} label={`${label} (m)`}>
                    <input
                      type="number"
                      min={0}
                      value={draft.speed[key] ?? 0}
                      onChange={(e) => update('speed', { ...draft.speed, [key]: Number(e.target.value) || 0 })}
                      className={inputCls}
                    />
                  </Field>
                ))}
              </div>
            </Section>

            <Section title="Caractéristiques" open={openSections.stats} onToggle={() => toggle('stats')}>
              <div className="grid grid-cols-6 gap-2">
                {ABILITIES.map((a) => (
                  <Field key={a} label={ABILITY_LABEL[a]}>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={draft[a]}
                      onChange={(e) => update(a, Math.max(1, Math.min(30, Number(e.target.value) || 10)))}
                      className={cn(inputCls, 'text-center')}
                    />
                  </Field>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <div className="text-xs uppercase tracking-wider text-parchment/70 mb-1">Jets de sauvegarde</div>
                  <AbilityBonusRows
                    rows={draft.saves}
                    onChange={(next) => update('saves', next)}
                    placeholder="ability (ex. dex)"
                  />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-parchment/70 mb-1">Compétences</div>
                  <AbilityBonusRows
                    rows={draft.skills}
                    onChange={(next) => update('skills', next)}
                    placeholder="skill (ex. perception)"
                  />
                </div>
              </div>
            </Section>

            <Section title="Défenses & listes" open={openSections.defenses} onToggle={() => toggle('defenses')}>
              <Field label="Résistances aux dégâts">
                <TagEditor
                  values={draft.damage_resistances}
                  onChange={(next) => update('damage_resistances', next)}
                  placeholder="ex. feu"
                />
              </Field>
              <Field label="Immunités aux dégâts">
                <TagEditor
                  values={draft.damage_immunities}
                  onChange={(next) => update('damage_immunities', next)}
                  placeholder="ex. poison"
                />
              </Field>
              <Field label="Vulnérabilités aux dégâts">
                <TagEditor
                  values={draft.damage_vulnerabilities}
                  onChange={(next) => update('damage_vulnerabilities', next)}
                  placeholder="ex. foudre"
                />
              </Field>
              <Field label="Immunités aux conditions">
                <TagEditor
                  values={draft.condition_immunities}
                  onChange={(next) => update('condition_immunities', next)}
                  placeholder="ex. empoisonné"
                />
              </Field>
            </Section>

            <Section title="Sens & langues" open={openSections.senses} onToggle={() => toggle('senses')}>
              <Field label="Sens" hint="ex. vision dans le noir 18 m, Perception passive 14">
                <input
                  type="text"
                  value={draft.senses}
                  onChange={(e) => update('senses', e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Langues">
                <input
                  type="text"
                  value={draft.languages}
                  onChange={(e) => update('languages', e.target.value)}
                  className={inputCls}
                  placeholder="ex. commun, gobelin"
                />
              </Field>
            </Section>

            <Section title="Défi" open={openSections.challenge} onToggle={() => toggle('challenge')}>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Facteur de puissance">
                  <select value={draft.cr} onChange={(e) => onCrChange(e.target.value)} className={inputCls}>
                    {CR_VALUES.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </Field>
                <Field label="XP" hint="auto depuis FP">
                  <input
                    type="number"
                    value={draft.xp}
                    onChange={(e) => update('xp', Number(e.target.value) || 0)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Bonus maîtrise" hint="auto depuis FP">
                  <input
                    type="number"
                    value={draft.proficiency_bonus}
                    onChange={(e) => update('proficiency_bonus', Number(e.target.value) || 2)}
                    className={inputCls}
                  />
                </Field>
              </div>
            </Section>

            <Section title="Capacités (traits)" open={openSections.traits} onToggle={() => toggle('traits')}>
              <ActionList title="Capacités" entries={draft.traits} onChange={(next) => update('traits', next)} />
            </Section>

            <Section title="Actions" open={openSections.actions} onToggle={() => toggle('actions')}>
              <ActionList title="Actions" entries={draft.actions} onChange={(next) => update('actions', next)} />
            </Section>

            <Section title="Réactions" open={openSections.reactions} onToggle={() => toggle('reactions')}>
              <ActionList title="Réactions" entries={draft.reactions} onChange={(next) => update('reactions', next)} />
            </Section>

            <Section title="Actions légendaires" open={openSections.legendary} onToggle={() => toggle('legendary')}>
              <Field label="Description légendaire">
                <textarea
                  value={draft.legendary_description}
                  onChange={(e) => update('legendary_description', e.target.value)}
                  className={cn(inputCls, 'min-h-16 resize-none')}
                  placeholder="La créature peut effectuer X actions légendaires…"
                />
              </Field>
              <ActionList
                title="Actions légendaires"
                entries={draft.legendary_actions}
                onChange={(next) => update('legendary_actions', next)}
              />
            </Section>

            <Section title="Notes" open={openSections.notes} onToggle={() => toggle('notes')}>
              <textarea
                value={draft.notes}
                onChange={(e) => update('notes', e.target.value)}
                className={cn(inputCls, 'w-full min-h-24 resize-none')}
                placeholder="Notes MJ (tactiques, accroches, variantes…)"
              />
            </Section>
          </div>

          <aside className="hidden lg:block border-l border-border/60 bg-night-deep/60 overflow-y-auto p-4">
            <div className="text-[10px] uppercase tracking-wider text-parchment/60 mb-2">Aperçu</div>
            <StatBlock monster={preview} compact />
          </aside>
        </div>
      </div>
    </div>
  );
}
