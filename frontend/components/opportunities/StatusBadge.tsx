import { statusLabel } from "../../lib/applications/applications";

const STATUS_STYLES: Record<string, string> = {
  published: "border-[rgba(0,103,71,0.35)] bg-[#e6f0ea] text-[#006747]",
  draft: "border-[rgba(65,143,222,0.45)] bg-rb-tag-surface text-[#1f4f82]",
  closed: "border-rb-border bg-rb-surface text-rb-muted",
};

/** Text label plus a dot, so status never depends on color alone. */
export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${
        STATUS_STYLES[status] ?? STATUS_STYLES.closed
      }`}
    >
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-current" />
      {statusLabel(status)}
    </span>
  );
}
