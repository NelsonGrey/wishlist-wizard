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
    <section aria-label="Sponsored" className="bg-white/80">
      <div className="site-container py-2">
        <div className="mx-auto w-full max-w-[970px]">
          <AdUnit
            slot={SLOT_IDS[placement]}
            format="auto"
            responsive={true}
            className="w-full"
          />
        </div>
      </div>
    </section>
  );
}
