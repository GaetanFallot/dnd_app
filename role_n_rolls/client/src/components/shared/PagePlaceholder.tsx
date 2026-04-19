import type { ReactNode } from 'react';

interface Props {
  title: string;
  phase?: string;
  children?: ReactNode;
}

export function PagePlaceholder({ title, phase, children }: Props) {
  return (
    <div className="h-full overflow-auto p-8">
      <header className="mb-6">
        <h1 className="heading-rune text-3xl">{title}</h1>
        {phase && <p className="text-muted-foreground mt-1 italic">{phase}</p>}
      </header>
      <div className="panel p-6">
        {children ?? (
          <p className="text-parchment/70">
            Cette section sera implémentée dans une phase ultérieure de la migration.
          </p>
        )}
      </div>
    </div>
  );
}
