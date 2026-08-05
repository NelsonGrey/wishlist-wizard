import { AdUnit } from "./AdUnit";

// Slot IDs from AdSense console
const SLOT_IDS = {
  top: '5307111653',    // Wishlist Wizard Below Header
  bottom: '7845645081', // Wishlist Wizard Above Footer
} as const;

interface GlobalAdSlotProps {
  placement: "top" | "bottom";
}

export function GlobalAdSlot({ placement }: GlobalAdSlotProps) {
  return (
    <section aria-label="Sponsored" className="pointer-events-none">
      {/*
        AdSense's ad-unclipping script can force an inline height on this
        slot's ancestors that no longer matches the actual ad's visible size,
        leaving an invisible box that overlaps page content below it and
        steals its clicks. pointer-events-none here means that stray box is
        never interactive; pointer-events-auto on AdUnit's own wrapper
        re-enables clicks on the actual ad content.
      */}
      <div className="site-container bg-white/80 py-2">
        <div className="mx-auto w-full max-w-[970px]">
          <AdUnit
            slot={SLOT_IDS[placement]}
            format="auto"
            responsive={true}
            className="w-full pointer-events-auto"
          />
        </div>
      </div>
    </section>
  );
}
