import { Badge } from "@/components/ui/badge";

export type CommissionLedgerState = "Tracked" | "Pending" | "Approved" | "Payable" | "Paid" | "Reversed";

const STATE_STYLES: Record<CommissionLedgerState, string> = {
  Tracked: "border-transparent bg-slate-100 text-slate-700",
  Pending: "border-transparent bg-amber-100 text-amber-900",
  Approved: "border-transparent bg-blue-100 text-blue-900",
  Payable: "border-transparent bg-emerald-100 text-emerald-900",
  Paid: "border-transparent bg-emerald-600 text-white",
  Reversed: "border-transparent bg-rose-100 text-rose-900",
};

export default function CommissionStateBadge({ state }: { state: CommissionLedgerState }) {
  return <Badge className={STATE_STYLES[state] || STATE_STYLES.Tracked}>{state}</Badge>;
}
