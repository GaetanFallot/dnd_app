import type { Monster } from '@/types/monster';
import { cn } from '@/lib/utils';

function asText(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.map(asText).join(', ');
  if (typeof v === 'object') {
    return Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => `${k}: ${asText(val)}`)
      .join(', ');
  }
  return String(v);
}

const DMG_FR: Record<string, string> = {
  bludgeoning: 'cont.', piercing: 'perf.', slashing: 'tranch.',
  lightning: 'foudre', fire: 'feu', cold: 'froid', acid: 'acide',
  poison: 'poison', necrotic: 'néc.', radiant: 'rad.',
  thunder: 'tonner.', force: 'force', psychic: 'psy.',
};

type Chip = { kind: 'recharge' | 'atk' | 'dc' | 'dmg'; text: string };

interface RawAction {
  attack_bonus?: number;
  damage?: Array<{
    damage_dice?: string;
    damage_type?: { index?: string; name?: string } | string;
  }>;
  dc?: { dc_type?: { name?: string } | string; dc_value?: number; success_type?: string };
  usage?: { type?: string; min_value?: number; times?: number };
}

function buildChips(a: RawAction): Chip[] {
  const out: Chip[] = [];
  const u = a.usage;
  if (u?.type === 'recharge on roll' && u.min_value !== undefined) {
    out.push({ kind: 'recharge', text: `⟳ ${u.min_value}–6` });
  } else if (u?.type === 'per day' && u.times) {
    out.push({ kind: 'recharge', text: `${u.times}/jour` });
  }
  if (a.attack_bonus != null) out.push({ kind: 'atk', text: `+${a.attack_bonus} toucher` });
  if (a.dc?.dc_value != null) {
    const name = typeof a.dc.dc_type === 'string' ? a.dc.dc_type : a.dc.dc_type?.name ?? '';
    const suf = a.dc.success_type === 'half' ? ' ½' : '';
    out.push({ kind: 'dc', text: `JS ${name} DD ${a.dc.dc_value}${suf}` });
  }
  if (a.damage?.length) {
    const str = a.damage
      .map((d) => {
        const t = d.damage_type;
        const label = typeof t === 'string' ? t : t?.index ? (DMG_FR[t.index] ?? t.name ?? '') : t?.name ?? '';
        return `${d.damage_dice ?? ''}${label ? ' ' + label : ''}`;
      })
      .filter(Boolean)
      .join(' + ');
    if (str) out.push({ kind: 'dmg', text: `⚔ ${str}` });
  }
  return out;
}

const CHIP_STYLE: Record<Chip['kind'], string> = {
  recharge: 'bg-amber-900/40 text-amber-300 border-amber-500/40',
  atk:      'bg-blue-900/20 text-blue-300 border-blue-500/30',
  dc:       'bg-purple-900/20 text-purple-300 border-purple-500/30',
  dmg:      'bg-orange-900/20 text-orange-300 border-orange-500/30',
};

function ChipRow({ chips }: { chips: Chip[] }) {
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {chips.map((c, i) => (
        <span
          key={i}
          className={cn(
            'inline-block text-[10px] px-1.5 py-0.5 rounded border font-display tracking-wide whitespace-nowrap',
            CHIP_STYLE[c.kind],
          )}
        >
          {c.text}
        </span>
      ))}
    </div>
  );
}

function ActionEntry({ entry }: { entry: { name: string; description?: string } & RawAction }) {
  return (
    <div className="mb-1.5">
      <p>
        <b><i>{entry.name}.</i></b> {entry.description}
      </p>
      <ChipRow chips={buildChips(entry)} />
    </div>
  );
}

interface Props {
  monster: Monster;
  compact?: boolean;
}

const AB = [
  ['strength', 'FOR'],
  ['dexterity', 'DEX'],
  ['constitution', 'CON'],
  ['intelligence', 'INT'],
  ['wisdom', 'SAG'],
  ['charisma', 'CHA'],
] as const;

const mod = (score?: number) => {
  if (typeof score !== 'number') return '';
  const m = Math.floor((score - 10) / 2);
  return `${m >= 0 ? '+' : ''}${m}`;
};

export function StatBlock({ monster, compact }: Props) {
  const m = monster;
  return (
    <div className={compact ? 'text-[11px] leading-snug' : 'text-sm leading-relaxed'}>
      <div className="font-display text-gold text-lg leading-tight">{m.name}</div>
      {m.type && <div className="italic text-parchment/70 text-xs">{m.type}</div>}

      <div className="my-2 border-t border-gold/30" />

      <div className="space-y-0.5">
        {m.armor_class !== undefined && <div><b>CA</b> : {asText(m.armor_class)}</div>}
        {m.hit_points !== undefined && <div><b>PV</b> : {asText(m.hit_points)}{m.hit_dice ? ` (${m.hit_dice})` : ''}</div>}
        {m.speed !== undefined && <div><b>Vitesse</b> : {asText(m.speed)}</div>}
      </div>

      <div className="my-2 border-t border-gold/30" />

      <div className="grid grid-cols-6 gap-1 text-center">
        {AB.map(([key, lbl]) => {
          const score = m[key] as number | undefined;
          return (
            <div key={key} className="rounded bg-night-deep/60 p-1.5 border border-border/40">
              <div className="text-[9px] uppercase tracking-wider text-gold/80">{lbl}</div>
              <div className="font-display text-sm">{score ?? '—'}</div>
              {score !== undefined && <div className="text-[10px] text-muted-foreground">({mod(score)})</div>}
            </div>
          );
        })}
      </div>

      <div className="my-2 border-t border-gold/30" />

      <div className="space-y-0.5">
        {m.saves !== undefined && <div><b>Sauvegardes</b> : {asText(m.saves)}</div>}
        {m.skills !== undefined && <div><b>Compétences</b> : {asText(m.skills)}</div>}
        {m.damage_resistances !== undefined && <div><b>Résistances</b> : {asText(m.damage_resistances)}</div>}
        {m.damage_immunities !== undefined && <div><b>Immunités dégâts</b> : {asText(m.damage_immunities)}</div>}
        {m.damage_vulnerabilities !== undefined && <div><b>Vulnérabilités</b> : {asText(m.damage_vulnerabilities)}</div>}
        {m.condition_immunities !== undefined && <div><b>Immunités conditions</b> : {asText(m.condition_immunities)}</div>}
        {m.senses && <div><b>Sens</b> : {asText(m.senses)}</div>}
        {m.languages && <div><b>Langues</b> : {asText(m.languages)}</div>}
        {(m.challenge_rating ?? m.cr) !== undefined && (
          <div><b>FP</b> : {asText(m.challenge_rating ?? m.cr)}{m.xp ? ` (${m.xp} PX)` : ''}</div>
        )}
      </div>

      {m.traits?.length ? (
        <section className="mt-2">
          <h4 className="font-display text-gold text-sm border-b border-gold/30 mb-1">Capacités</h4>
          {m.traits.map((t, i) => (
            <ActionEntry key={i} entry={t as { name: string; description?: string } & RawAction} />
          ))}
        </section>
      ) : null}

      {m.actions?.length ? (
        <section className="mt-2">
          <h4 className="font-display text-gold text-sm border-b border-gold/30 mb-1">Actions</h4>
          {m.actions.map((a, i) => (
            <ActionEntry key={i} entry={a as { name: string; description?: string } & RawAction} />
          ))}
        </section>
      ) : null}

      {m.reactions?.length ? (
        <section className="mt-2">
          <h4 className="font-display text-gold text-sm border-b border-gold/30 mb-1">Réactions</h4>
          {m.reactions.map((a, i) => (
            <ActionEntry key={i} entry={a as { name: string; description?: string } & RawAction} />
          ))}
        </section>
      ) : null}

      {m.legendary_actions?.length || m.legendary_description ? (
        <section className="mt-2">
          <h4 className="font-display text-gold text-sm border-b border-gold/30 mb-1">Actions légendaires</h4>
          {m.legendary_description && <p className="mb-1 italic">{m.legendary_description}</p>}
          {m.legendary_actions?.map((a, i) => (
            <ActionEntry key={i} entry={a as { name: string; description?: string } & RawAction} />
          ))}
        </section>
      ) : null}

      {m.notes && (
        <section className="mt-2 text-parchment/70 italic">
          {m.notes}
        </section>
      )}
    </div>
  );
}
