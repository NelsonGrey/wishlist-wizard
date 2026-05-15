import { ResponsiveAd } from "./AdUnit";

/**
 * Global ad reservation area rendered in a consistent position across layouts.
 * Keeps monetization predictable without scattering ad blocks throughout pages.
 */
interface GlobalAdSlotProps {
  placement: "top" | "bottom";
}

export function GlobalAdSlot({ placement }: GlobalAdSlotProps) {
  return (
    <section aria-label={`Sponsored ${placement}`} className="border-y border-emerald-100 bg-white/80">
      <div className="container mx-auto px-4 py-3">
        <div className="min-h-[132px] rounded-lg border border-dashed border-emerald-200 bg-emerald-50/40 px-3 py-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">Sponsored</p>
            <p className="text-[11px] text-emerald-700/80">Reserved placement</p>
          </div>
          <div className="mx-auto w-full max-w-[970px] min-h-[74px]">
            <ResponsiveAd />
          </div>
        </div>
      </div>
    </section>
  );
}
