import AteFloIcon, { getTagIconName } from "@/components/AteFloIcon";

interface ToolTagChipsProps {
  readonly tags: readonly string[];
  readonly maxVisible?: number;
  readonly animate?: boolean;
}

function formatTag(tag: string): string {
  return tag
    .replace(/-/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function TagPill({ tag }: { readonly tag: string }) {
  return (
    <span className="inline-flex min-h-7 shrink-0 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-[11px] font-semibold leading-none text-slate-700 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
      <span
        aria-hidden="true"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-teal-50 text-teal-700"
      >
        <AteFloIcon name={getTagIconName(tag)} className="h-3 w-3" />
      </span>
      {formatTag(tag)}
    </span>
  );
}

export default function ToolTagChips({
  tags,
  maxVisible = 4,
  animate = false,
}: ToolTagChipsProps) {
  const visibleTags = tags.slice(0, maxVisible);
  const hiddenCount = Math.max(0, tags.length - visibleTags.length);
  const railTags = hiddenCount > 0 ? [...visibleTags, `+${hiddenCount} more`] : visibleTags;

  return (
    <div className="ateflo-tag-rail overflow-x-auto overflow-y-hidden">
      <div
        className={`flex w-max gap-1.5 pr-1 ${
          animate ? "ateflo-tag-rail-track" : ""
        }`}
      >
        {railTags.map((tag) => (
          <TagPill key={tag} tag={tag} />
        ))}
        {animate &&
          railTags.map((tag) => (
            <TagPill key={`${tag}-copy`} tag={tag} />
          ))}
      </div>
      {hiddenCount > 0 && !animate && (
        <span className="sr-only">{hiddenCount} more tags available</span>
      )}
    </div>
  );
}
