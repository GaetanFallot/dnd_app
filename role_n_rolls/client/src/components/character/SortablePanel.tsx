import type { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  id: string;
  children: ReactNode;
}

/**
 * Wraps any panel with a floating drag handle. The panel itself is rendered
 * as-is, so existing panel styling keeps working.
 */
export function SortablePanel({ id, children }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'relative group',
        isDragging && 'opacity-40 z-10',
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className={cn(
          'absolute top-3 right-3 z-10 w-7 h-7 rounded border border-border/60 bg-night-deep/80',
          'flex items-center justify-center text-muted-foreground',
          'opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-grab active:cursor-grabbing',
          'hover:text-gold hover:border-gold',
        )}
        aria-label="Déplacer ce panneau"
        title="Glisser pour réordonner"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      {children}
    </div>
  );
}
