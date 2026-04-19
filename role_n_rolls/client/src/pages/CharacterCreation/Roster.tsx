import { useNavigate } from 'react-router-dom';
import { useRef } from 'react';
import {
  useCharactersList,
  useCreateCharacter,
  useImportCharacter,
  useRemoveCharacter,
} from '@/hooks/useCharacters';
import { profBonus } from '@/lib/helpers/dndRules';
import { downloadJson, decodeCharacter } from '@/lib/helpers/characterShare';
import type { DnDCharacter } from '@/types/character';
import { Plus, Trash2, Download, Upload, Share2, Eye, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Roster() {
  const nav = useNavigate();
  const list = useCharactersList();
  const createM = useCreateCharacter();
  const importM = useImportCharacter();
  const removeM = useRemoveCharacter();
  const importInput = useRef<HTMLInputElement | null>(null);

  const roster = list.data ?? [];

  const newChar = async () => {
    try {
      const rec = await createM.mutateAsync();
      nav(`/character/${rec.id}`);
    } catch (err) {
      alert('Création impossible : ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const onImport = async (files: FileList) => {
    for (const f of Array.from(files)) {
      try {
        const text = await f.text();
        const data = JSON.parse(text) as DnDCharacter;
        await importM.mutateAsync(data);
      } catch (err) {
        console.warn('[character] import failed', f.name, err);
      }
    }
  };

  const importFromLink = async () => {
    const url = window.prompt(
      'Colle ici un lien de partage de personnage (ou juste la partie après #/character/shared/)',
    );
    if (!url) return;
    try {
      const encoded = url.split('/').pop() ?? url;
      const data = decodeCharacter(encoded);
      const rec = await importM.mutateAsync(data);
      nav(`/character/${rec.id}`);
    } catch (err) {
      alert('Lien invalide : ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const onRemove = (id: string, name: string) => {
    if (!window.confirm(`Supprimer "${name}" ?`)) return;
    removeM.mutate(id);
  };

  return (
    <div className="h-full overflow-auto p-6">
      <header className="flex items-center gap-3 mb-6 flex-wrap">
        <h1 className="heading-rune text-3xl flex-1">📜 Personnages</h1>
        <button
          type="button"
          onClick={newChar}
          disabled={createM.isPending}
          className="btn-rune disabled:opacity-60"
        >
          {createM.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Nouveau
        </button>
        <button type="button" onClick={() => importInput.current?.click()} className="btn-rune">
          <Upload className="w-4 h-4" /> Importer JSON
        </button>
        <button type="button" onClick={importFromLink} className="btn-rune">
          <Share2 className="w-4 h-4" /> Importer lien
        </button>
        <input
          ref={importInput}
          type="file"
          accept=".json,application/json"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void onImport(e.target.files);
            e.target.value = '';
          }}
        />
      </header>

      {list.isLoading ? (
        <div className="panel p-8 text-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-gold" />
          <p className="italic mt-2">Chargement du roster…</p>
        </div>
      ) : list.isError ? (
        <div className="panel p-6 text-center text-blood border-blood/40">
          <p className="italic">Erreur de chargement : {(list.error as Error).message}</p>
          <button type="button" onClick={() => list.refetch()} className="btn-rune mt-3">
            Réessayer
          </button>
        </div>
      ) : roster.length === 0 ? (
        <div className="panel p-8 text-center text-muted-foreground">
          <p className="italic mb-4">Aucun personnage pour le moment.</p>
          <button type="button" onClick={newChar} className="btn-rune">
            <Plus className="w-4 h-4" /> Créer ton premier héros
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {roster.map((r) => {
            const c = r.data;
            const pb = profBonus(c.level);
            return (
              <div key={r.id} className="panel p-4 space-y-3 group">
                <button
                  type="button"
                  onClick={() => nav(`/character/${r.id}`)}
                  className="w-full text-left space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-full border-2 border-gold/40 flex items-center justify-center text-2xl bg-cover bg-center',
                      )}
                      style={c._portrait ? { backgroundImage: `url(${c._portrait})` } : undefined}
                    >
                      {!c._portrait && (c._classIcon || '🗡️')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-gold truncate">{c.char_name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {c._className || 'Sans classe'} • Niv. {c.level}
                      </div>
                    </div>
                  </div>
                </button>
                <div className="grid grid-cols-3 gap-1 text-center text-xs">
                  <div className="bg-night-deep/60 rounded py-1">
                    <div className="text-[10px] text-muted-foreground">PV</div>
                    <div className="font-display text-parchment">
                      {c.hp_current}/{c.hp_max}
                    </div>
                  </div>
                  <div className="bg-night-deep/60 rounded py-1">
                    <div className="text-[10px] text-muted-foreground">CA</div>
                    <div className="font-display text-parchment">{c.ac}</div>
                  </div>
                  <div className="bg-night-deep/60 rounded py-1">
                    <div className="text-[10px] text-muted-foreground">Maîtrise</div>
                    <div className="font-display text-parchment">+{pb}</div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => nav(`/character/${r.id}`)}
                    className="btn-rune text-xs flex-1 px-2"
                  >
                    <Eye className="w-3 h-3" /> Voir
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadJson(c)}
                    className="btn-rune text-xs px-2"
                    title="Exporter JSON"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(r.id, c.char_name)}
                    className="btn-blood text-xs px-2"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
