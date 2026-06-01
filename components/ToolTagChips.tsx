interface ToolTagChipsProps {
  readonly tags: readonly string[];
  readonly maxVisible?: number;
}

function formatTag(tag: string): string {
  return tag
    .replace(/-/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function ToolTagChips({
  tags,
  maxVisible = 4,
}: ToolTagChipsProps) {
  const visibleTags = tags.slice(0, maxVisible);
  const hiddenCount = Math.max(0, tags.length - visibleTags.length);

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibleTags.map((tag) => (
        <span
          key={tag}
          className="inline-flex min-h-7 items-center rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold leading-none text-slate-700 ring-1 ring-inset ring-slate-200"
        >
          {formatTag(tag)}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span className="inline-flex min-h-7 items-center rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold leading-none text-slate-500 ring-1 ring-inset ring-slate-200">
          +{hiddenCount} more
        </span>
      )}
    </div>
  );
}
