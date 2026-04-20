import { cn } from '@/lib/utils';

/**
 * Shared chip vocabulary — used by the monster stat block (combat chips)
 * and the spell card (metadata chips). The style map is keyed by the same
 * `kind` token so every surface agrees on what a "dc" chip looks like.
 *
 * Damage-type chips fall back to a free-form className on `ChipDef` so the
 * caller can pick a palette per damage type (feu, foudre, radiant…) without
 * leaking that enum into this module.
 */
export type ChipKind =
  | 'recharge'
  | 'atk'
  | 'dc'
  | 'dmg'
  | 'conc'
  | 'ritual'
  | 'level'
  | 'school';

export type ChipDef = {
  kind: ChipKind;
  text: string;
  /** Override the default kind-based style (used for damage-type colouring). */
  className?: string;
};

const CHIP_STYLE: Record<ChipKind, string> = {
  recharge: 'bg-amber-900/40 text-amber-300 border-amber-500/40',
  atk: 'bg-blue-900/20 text-blue-300 border-blue-500/30',
  dc: 'bg-purple-900/20 text-purple-300 border-purple-500/30',
  dmg: 'bg-orange-900/20 text-orange-300 border-orange-500/30',
  conc: 'bg-blue-900/20 text-blue-300 border-blue-500/30',
  ritual: 'bg-purple-900/20 text-purple-300 border-purple-500/30',
  level: 'bg-gold/10 text-gold border-gold/40',
  school: 'bg-night-deep/60 text-parchment/80 border-border/50',
};

export function ChipRow({ chips }: { chips: ChipDef[] }) {
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {chips.map((c, i) => (
        <span
          key={i}
          className={cn(
            'inline-block text-[10px] px-1.5 py-0.5 rounded border font-display tracking-wide whitespace-nowrap',
            c.className ?? CHIP_STYLE[c.kind],
          )}
        >
          {c.text}
        </span>
      ))}
    </div>
  );
}
