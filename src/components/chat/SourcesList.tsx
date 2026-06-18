import { FileText } from "lucide-react";

export type Source = { source: string; title: string | null; similarity: number };

export function SourcesList({ sources }: { sources: Source[] }) {
  if (!sources?.length) return null;
  return (
    <div className="mt-3 border-t pt-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
        Sources
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {sources.map((s, i) => (
          <li
            key={`${s.source}-${i}`}
            className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] text-foreground/80"
            title={`Similarity ${s.similarity.toFixed(2)}`}
          >
            <FileText className="h-2.5 w-2.5 opacity-60" />
            <span>{s.title ?? s.source}</span>
            <span className="opacity-50">{s.similarity.toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
