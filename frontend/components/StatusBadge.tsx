import { STATUS_LABEL, STATUS_COLOR } from "@/lib/constants";

export default function StatusBadge({ status }: { status: number }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[status] ?? "bg-slate-500/20 text-slate-400"}`}>
      {STATUS_LABEL[status] ?? "Unknown"}
    </span>
  );
}
