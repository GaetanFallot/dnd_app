import { useMemo, useState } from 'react';
import type { LoreEntityType } from '@/types/supabase';
import { LORE_TYPE_META } from '@/pages/LoreBuilder/meta';
import { useImageUpload } from '@/hooks/useImageUpload';
import {
  Castle,
  Crown,
  Shield,
  Sword,
  Swords,
  Gem,
  Skull,
  Wand2,
  Sparkles,
  Flame,
  Star,
  BookOpen,
  Scroll,
  Key,
  Gift,
  Crosshair,
  Users,
  UserCircle,
  User,
  Ghost,
  Eye,
  Zap,
  Moon,
  Sun,
  MapPin,
  Mountain,
  Tent,
  Home,
  Church,
  Landmark,
  Anchor,
  Compass,
  Hammer,
  Pickaxe,
  Axe,
  X,
  Check,
  Upload,
  Loader2,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';

/**
 * Each entity type has a curated shortlist of lucide icons that fit the
 * narrative. Users can also drop in a custom image URL (or data URL) via
 * the "Image personnalisée" field — that takes priority over the lucide
 * pick when rendering.
 *
 * Storage convention: we piggy-back on `lore_entities.image_url`:
 *   - `lucide:<icon-slug>` → one of the curated lucide icons
 *   - `https://...` / `data:image/...` → rendered as <img>
 *   - `null` → fall back to the type's default lucide icon
 */

export const LUCIDE_ICONS: Record<string, LucideIcon> = {
  castle: Castle,
  crown: Crown,
  shield: Shield,
  sword: Sword,
  swords: Swords,
  gem: Gem,
  skull: Skull,
  wand: Wand2,
  sparkles: Sparkles,
  flame: Flame,
  star: Star,
  book: BookOpen,
  scroll: Scroll,
  key: Key,
  gift: Gift,
  crosshair: Crosshair,
  users: Users,
  usercircle: UserCircle,
  user: User,
  ghost: Ghost,
  eye: Eye,
  zap: Zap,
  moon: Moon,
  sun: Sun,
  pin: MapPin,
  mountain: Mountain,
  tent: Tent,
  home: Home,
  church: Church,
  landmark: Landmark,
  anchor: Anchor,
  compass: Compass,
  hammer: Hammer,
  pickaxe: Pickaxe,
  axe: Axe,
};

export const DEFAULT_ICON_BY_TYPE: Record<LoreEntityType, keyof typeof LUCIDE_ICONS> = {
  city:     'castle',
  family:   'crown',
  npc:      'user',
  guild:    'hammer',
  creature: 'skull',
  faction:  'swords',
  place:    'mountain',
  object:   'key',
  deity:    'sparkles',
  other:    'scroll',
};

export const SUGGESTIONS_BY_TYPE: Record<LoreEntityType, Array<keyof typeof LUCIDE_ICONS>> = {
  city:     ['castle', 'landmark', 'home', 'tent', 'anchor', 'compass', 'church'],
  family:   ['crown', 'users', 'shield', 'star', 'sword'],
  npc:      ['user', 'usercircle', 'ghost', 'crown', 'scroll'],
  guild:    ['hammer', 'pickaxe', 'axe', 'swords', 'scroll'],
  creature: ['skull', 'ghost', 'eye', 'flame', 'axe'],
  faction:  ['swords', 'shield', 'crown', 'sword', 'flame'],
  place:    ['mountain', 'tent', 'compass', 'pin', 'anchor'],
  object:   ['key', 'gem', 'gift', 'scroll', 'wand'],
  deity:    ['sparkles', 'sun', 'moon', 'star', 'flame', 'eye'],
  other:    ['scroll', 'book', 'star', 'zap'],
};

export function parseIconRef(ref: string | null | undefined):
  | { kind: 'lucide'; slug: keyof typeof LUCIDE_ICONS }
  | { kind: 'image'; url: string }
  | { kind: 'none' } {
  if (!ref) return { kind: 'none' };
  if (ref.startsWith('lucide:')) {
    const slug = ref.slice('lucide:'.length) as keyof typeof LUCIDE_ICONS;
    if (LUCIDE_ICONS[slug]) return { kind: 'lucide', slug };
    return { kind: 'none' };
  }
  return { kind: 'image', url: ref };
}

export function EntityIcon({
  type,
  iconRef,
  size = 24,
  className,
}: {
  type: LoreEntityType;
  iconRef: string | null | undefined;
  size?: number;
  className?: string;
}) {
  const parsed = parseIconRef(iconRef);
  if (parsed.kind === 'image') {
    return (
      <img
        src={parsed.url}
        alt=""
        className={className}
        style={{ width: size, height: size, objectFit: 'cover', borderRadius: '25%' }}
      />
    );
  }
  const slug = parsed.kind === 'lucide' ? parsed.slug : DEFAULT_ICON_BY_TYPE[type];
  const Ico = LUCIDE_ICONS[slug];
  return <Ico size={size} className={className} aria-hidden />;
}

interface Props {
  open: boolean;
  type: LoreEntityType;
  value: string | null | undefined;
  onChange: (ref: string | null) => void;
  onClose: () => void;
}

export function IconPicker({ open, type, value, onChange, onClose }: Props) {
  const [customUrl, setCustomUrl] = useState(() => {
    const p = parseIconRef(value);
    return p.kind === 'image' ? p.url : '';
  });
  const [search, setSearch] = useState('');
  const [fallbackWarning, setFallbackWarning] = useState(false);
  const uploadM = useImageUpload();

  const suggestions = SUGGESTIONS_BY_TYPE[type] ?? SUGGESTIONS_BY_TYPE.other;

  const filteredAll = useMemo(() => {
    const q = search.trim().toLowerCase();
    const keys = Object.keys(LUCIDE_ICONS);
    if (!q) return keys;
    return keys.filter((k) => k.includes(q));
  }, [search]);

  if (!open) return null;

  const parsed = parseIconRef(value);
  const currentSlug = parsed.kind === 'lucide' ? parsed.slug : null;

  const onFile = async (file: File) => {
    try {
      const { url, isFallback } = await uploadM.mutateAsync(file);
      setFallbackWarning(isFallback);
      onChange(url);
    } catch (err) {
      alert('Upload impossible : ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-stretch justify-center p-4">
      <div className="panel flex flex-col w-full max-w-3xl max-h-full overflow-hidden">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
          <h2 className="heading-rune text-lg flex-1">
            Choisir une icône · {LORE_TYPE_META[type].label}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-parchment"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Suggestions */}
          <section>
            <h3 className="font-display font-bold text-gold text-sm mb-2">
              Suggérées pour {LORE_TYPE_META[type].label}
            </h3>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-2">
              {suggestions.map((slug) => (
                <IconCell
                  key={slug}
                  slug={slug}
                  selected={currentSlug === slug}
                  onClick={() => onChange(`lucide:${slug}`)}
                />
              ))}
            </div>
          </section>

          {/* Custom image upload */}
          <section className="space-y-2 pt-2 border-t border-border/40">
            <h3 className="font-display font-bold text-gold text-sm">Image personnalisée</h3>
            <div className="flex items-center gap-2">
              <label
                className={
                  'btn-rune text-xs cursor-pointer ' +
                  (uploadM.isPending ? 'opacity-60 cursor-wait' : '')
                }
                title="Charger une image locale (PNG, JPG, SVG)"
              >
                {uploadM.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Upload className="w-3 h-3" />
                )}
                {uploadM.isPending ? 'Envoi…' : 'Importer'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadM.isPending}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onFile(f);
                    e.target.value = '';
                  }}
                />
              </label>
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="ou URL https://…"
                className="flex-1 bg-input border border-border/60 rounded px-2 py-1 text-sm focus:outline-none focus:border-gold"
              />
              <button
                type="button"
                onClick={() => { setFallbackWarning(false); onChange(customUrl.trim() || null); }}
                disabled={!customUrl.trim()}
                className="btn-rune text-xs disabled:opacity-40"
              >
                Utiliser l'URL
              </button>
            </div>
            {fallbackWarning && (
              <p className="text-[11px] text-amber-400 flex items-start gap-1.5 leading-snug">
                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                Storage inaccessible (bucket `lore-images` absent ?) — l'image est stockée
                en base64 dans la DB. Applique la migration{' '}
                <code className="font-mono">0004_storage.sql</code>.
              </p>
            )}
            {parsed.kind === 'image' && (
              <div className="flex items-center gap-3 pt-1">
                <img
                  src={parsed.url}
                  alt=""
                  className="w-14 h-14 rounded object-cover border border-gold/40"
                />
                <div className="text-xs italic text-muted-foreground truncate">
                  {parsed.url.startsWith('data:') ? 'Image (base64)' : 'Image (Storage)'}
                </div>
              </div>
            )}
          </section>

          {/* Full gallery */}
          <section className="pt-2 border-t border-border/40">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-display font-bold text-gold text-sm">
                Toutes les icônes ({Object.keys(LUCIDE_ICONS).length})
              </h3>
              <input
                type="text"
                placeholder="Rechercher (castle, skull, …)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ml-auto bg-input border border-border/60 rounded px-2 py-1 text-xs w-48 focus:outline-none focus:border-gold"
              />
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {filteredAll.map((slug) => (
                <IconCell
                  key={slug}
                  slug={slug as keyof typeof LUCIDE_ICONS}
                  selected={currentSlug === slug}
                  onClick={() => onChange(`lucide:${slug}`)}
                />
              ))}
            </div>
          </section>
        </div>

        <footer className="flex gap-2 px-4 py-3 border-t border-border/60">
          <button
            type="button"
            onClick={() => onChange(null)}
            className="btn-rune text-xs"
          >
            Retirer l'icône
          </button>
          <div className="flex-1" />
          <button type="button" onClick={onClose} className="btn-rune text-xs">
            Fermer
          </button>
        </footer>
      </div>
    </div>
  );
}

function IconCell({
  slug,
  selected,
  onClick,
}: {
  slug: keyof typeof LUCIDE_ICONS;
  selected: boolean;
  onClick: () => void;
}) {
  const Ico = LUCIDE_ICONS[slug];
  return (
    <button
      type="button"
      onClick={onClick}
      title={slug}
      className={
        'aspect-square rounded border flex flex-col items-center justify-center gap-1 transition-all ' +
        (selected
          ? 'bg-gold/10 border-gold text-gold shadow-[0_0_12px_rgba(201,168,76,0.25)]'
          : 'border-border/60 text-parchment/70 hover:text-gold hover:border-gold/50')
      }
    >
      <Ico className="w-5 h-5" />
      <span className="text-[9px] uppercase tracking-wider truncate max-w-full px-1">
        {slug}
      </span>
      {selected && <Check className="absolute top-0.5 right-0.5 w-3 h-3 text-gold" />}
    </button>
  );
}
