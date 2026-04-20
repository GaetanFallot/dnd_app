import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { cn } from '@/lib/utils';
import { Mail, Lock, LogIn, UserPlus, Send, Loader2, Dices } from 'lucide-react';

type Mode = 'sign-in' | 'sign-up' | 'magic';

export function AuthPage() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('next') ?? '/session';
  const { session, ready } = useAuth();

  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (ready && session) return <Navigate to={redirectTo} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === 'sign-up') {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: displayName.trim() ? { display_name: displayName.trim() } : undefined,
            emailRedirectTo: window.location.origin + redirectTo,
          },
        });
        if (err) throw err;
        setInfo('✓ Compte créé. Vérifie ta boîte mail pour confirmer.');
      } else if (mode === 'sign-in') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin + redirectTo },
        });
        if (err) throw err;
        setInfo('✓ Lien magique envoyé. Clique sur le lien reçu par mail pour te connecter.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6">
      <div className="panel w-full max-w-md p-6 space-y-5">
        <div className="text-center space-y-1">
          <Dices className="w-10 h-10 text-gold mx-auto" />
          <h1 className="heading-rune text-2xl">Roll'n'Roles</h1>
          <p className="text-xs text-muted-foreground font-body italic">
            Connecte-toi pour synchroniser tes personnages et tes campagnes
          </p>
        </div>

        <div className="flex gap-1 bg-night-deep rounded p-0.5">
          {(['sign-in', 'sign-up', 'magic'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(null); setInfo(null); }}
              className={cn(
                'flex-1 px-3 py-1.5 rounded text-xs font-display uppercase tracking-wider',
                mode === m ? 'bg-gold/15 text-gold' : 'text-parchment/70 hover:text-parchment',
              )}
            >
              {m === 'sign-in' ? 'Connexion' : m === 'sign-up' ? 'Inscription' : 'Magic link'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'sign-up' && (
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Nom affiché (optionnel)</span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Gaëtan"
                className="bg-input border border-border/60 rounded px-3 py-2 text-sm focus:outline-none focus:border-gold"
              />
            </label>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Email</span>
            <div className="relative">
              <Mail className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-input border border-border/60 rounded pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-gold"
              />
            </div>
          </label>

          {mode !== 'magic' && (
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Mot de passe</span>
              <div className="relative">
                <Lock className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-input border border-border/60 rounded pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-gold"
                />
              </div>
            </label>
          )}

          {error && (
            <div className="text-sm text-blood bg-blood/10 border border-blood/30 rounded px-3 py-2">
              {error}
            </div>
          )}
          {info && (
            <div className="text-sm text-gold bg-gold/10 border border-gold/30 rounded px-3 py-2">
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-rune w-full disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'sign-in' ? <LogIn className="w-4 h-4" /> : mode === 'sign-up' ? <UserPlus className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            {mode === 'sign-in' ? 'Se connecter' : mode === 'sign-up' ? 'Créer le compte' : 'Recevoir un lien'}
          </button>
        </form>

        <p className="text-xs text-center text-muted-foreground">
          Tes personnages et campagnes sont synchronisés sur tes appareils.
        </p>
      </div>
    </div>
  );
}
