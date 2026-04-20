import type { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  id: string;
  children: ReactNode;
  /** When true the drag handle disappears and useSortable is disabled. */
  disabled?: boolean;
}

/**
 * Wraps any panel with a floating drag handle. The panel itself is rendered
 * as-is, so existing panel styling keeps working.
 */
export function SortablePanel({ id, children, disabled = false }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'relative group h-full',
        isDragging && 'opacity-40 z-10',
      )}
    >
      {!disabled && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className={cn(
            'absolute top-2 left-2 z-10 w-7 h-7 rounded border border-gold/50 bg-night-deep/90',
            'flex items-center justify-center text-gold',
            'cursor-grab active:cursor-grabbing shadow-[0_0_8px_rgba(201,168,76,0.25)]',
            'hover:bg-gold/15',
          )}
          aria-label="Déplacer ce panneau"
          title="Glisser pour réordonner"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}
      {children}
    </div>
  );
}
