import { THEME_PRESETS, useTheme, type ThemeColors } from '@/stores/theme';
import { Palette, RotateCcw, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const SWATCH_KEYS: Array<{ key: keyof ThemeColors; label: string; hint: string }> = [
  { key: 'primary',    label: 'Primaire',    hint: 'Or des titres, boutons principaux' },
  { key: 'secondary',  label: 'Secondaire',  hint: 'Accents blood / destructif' },
  { key: 'tertiary',   label: 'Tertiaire',   hint: 'Panels, cards, surfaces calmes' },
  { key: 'background', label: 'Arrière-plan',hint: 'Couleur de fond principale' },
  { key: 'accent',     label: 'Texte clair', hint: 'Parchemin / foreground' },
];

export function SettingsPage() {
  const { colors, setColors, resetToPreset } = useTheme();

  return (
    <div className="h-full overflow-auto p-6 space-y-6 max-w-4xl mx-auto w-full">
      <header>
        <h1 className="heading-rune text-3xl flex items-center gap-3">
          <Palette className="w-6 h-6" /> Paramètres
        </h1>
        <p className="text-muted-foreground text-sm mt-1 italic">
          Personnalise les couleurs de ton grimoire. Le logo Role'n'Rolls garde son or —
          le reste suit tes choix.
        </p>
      </header>

      {/* Presets */}
      <section className="panel p-4 space-y-3">
        <h2 className="heading-rune text-sm">Thèmes préréglés</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(THEME_PRESETS) as Array<keyof typeof THEME_PRESETS>).map((name) => {
            const preset = THEME_PRESETS[name];
            const matches =
              preset.primary === colors.primary &&
              preset.secondary === colors.secondary &&
              preset.tertiary === colors.tertiary;
            return (
              <button
                key={name}
                type="button"
                onClick={() => resetToPreset(name)}
                className={cn(
                  'relative text-left rounded-lg p-3 border transition-all',
                  matches
                    ? 'border-gold bg-gold/5 shadow-[0_0_12px_rgba(201,168,76,0.25)]'
                    : 'border-border/60 hover:border-gold/50',
                )}
                style={{ background: matches ? undefined : preset.background }}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="w-5 h-5 rounded-full border border-black/40" style={{ background: preset.primary }} />
                  <span className="w-5 h-5 rounded-full border border-black/40" style={{ background: preset.secondary }} />
                  <span className="w-5 h-5 rounded-full border border-black/40" style={{ background: preset.tertiary }} />
                  {matches && <Check className="w-4 h-4 text-gold ml-auto" />}
                </div>
                <div className="font-display text-gold text-sm font-bold">{name}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Custom picker */}
      <section className="panel p-4 space-y-3">
        <h2 className="heading-rune text-sm flex items-center gap-2">
          Personnalisation manuelle
          <button
            type="button"
            onClick={() => resetToPreset('Grimoire Doré')}
            className="ml-auto btn-rune text-xs"
          >
            <RotateCcw className="w-3 h-3" /> Revenir au défaut
          </button>
        </h2>
        <div className="grid gap-3">
          {SWATCH_KEYS.map(({ key, label, hint }) => (
            <div key={key} className="flex items-center gap-3 bg-night-deep/40 rounded p-2">
              <input
                type="color"
                value={colors[key]}
                onChange={(e) => setColors({ [key]: e.target.value } as Partial<ThemeColors>)}
                className="w-12 h-10 rounded cursor-pointer bg-transparent border border-border/60"
              />
              <div className="flex-1 min-w-0">
                <div className="font-display text-gold text-sm font-bold">{label}</div>
                <div className="text-xs text-muted-foreground italic truncate">{hint}</div>
              </div>
              <input
                type="text"
                value={colors[key]}
                onChange={(e) => setColors({ [key]: e.target.value } as Partial<ThemeColors>)}
                className="w-28 font-mono text-xs bg-input border border-border/60 rounded px-2 py-1 focus:outline-none focus:border-gold"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Live preview */}
      <section className="panel p-4 space-y-3">
        <h2 className="heading-rune text-sm">Aperçu en direct</h2>
        <div
          className="rounded-lg p-6 border border-border/60"
          style={{ background: colors.background }}
        >
          <div className="space-y-3">
            <h3
              className="font-display font-bold text-2xl"
              style={{ color: colors.primary, letterSpacing: '0.08em' }}
            >
              ⚔ Valthoria ⚔
            </h3>
            <p style={{ color: colors.accent }} className="text-sm leading-relaxed">
              Cité-capitale bâtie sur sept collines, ses tours d'ambre projettent une lumière qu'on
              dit capable de repousser les ombres.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="px-3 py-1.5 rounded text-sm font-display uppercase tracking-wider font-bold"
                style={{ background: colors.primary, color: colors.background }}
              >
                Action
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded text-sm font-display uppercase tracking-wider font-bold border"
                style={{ borderColor: colors.secondary, color: colors.secondary, background: 'transparent' }}
              >
                Danger
              </button>
              <div
                className="ml-auto px-3 py-1.5 rounded text-xs italic"
                style={{ background: colors.tertiary, color: colors.accent }}
              >
                Panel / card
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
