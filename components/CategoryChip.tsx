import AteFloIcon, { getCategoryIconName } from "@/components/AteFloIcon";

interface CategoryChipProps {
  readonly label: string;
  readonly className?: string;
}

export default function CategoryChip({ label, className }: CategoryChipProps) {
  return (
    <span
      className={`inline-flex min-h-7 max-w-full items-center justify-center gap-1.5 rounded-full border border-teal-100 bg-teal-50/80 px-2.5 py-1 text-xs font-semibold uppercase leading-none tracking-[0.12em] text-teal-800 ${className ?? ""}`}
    >
      <AteFloIcon
        name={getCategoryIconName(label)}
        className="h-3.5 w-3.5 shrink-0"
      />
      <span className="truncate leading-none">{label}</span>
    </span>
  );
}
