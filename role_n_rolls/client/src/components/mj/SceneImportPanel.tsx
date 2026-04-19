import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Upload } from 'lucide-react';

interface Props {
  onFiles: (files: FileList) => void;
}

export function SceneImportPanel({ onFiles }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [hover, setHover] = useState(false);

  return (
    <div className="panel p-4 space-y-2">
      <div className="heading-rune text-sm">Importer (image / vidéo)</div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setHover(true); }}
        onDragLeave={() => setHover(false)}
        onDrop={(e) => {
          e.preventDefault();
          setHover(false);
          if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
        }}
        className={cn(
          'cursor-pointer rounded-md border-2 border-dashed p-4 text-center transition-colors',
          hover ? 'border-gold bg-gold/5' : 'border-border/60 hover:border-gold/60',
        )}
      >
        <Upload className="w-6 h-6 mx-auto mb-1 text-gold" />
        <div className="text-xs text-parchment/80">
          Images, battlemaps, .mp4, .webm…
          <br />
          <span className="text-muted-foreground">Clic ou glisser-déposer</span>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/mp4,video/webm"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
