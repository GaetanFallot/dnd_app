import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export function NoCampaignHint({ title }: { title: string }) {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="panel p-8 max-w-md text-center space-y-3">
        <Compass className="w-10 h-10 text-gold mx-auto" />
        <h2 className="heading-rune text-xl">{title}</h2>
        <p className="text-muted-foreground text-sm">
          Choisis (ou crée) une campagne pour accéder à cet espace.
        </p>
        <Link to="/session" className="btn-rune">
          Aller aux parties
        </Link>
      </div>
    </div>
  );
}
