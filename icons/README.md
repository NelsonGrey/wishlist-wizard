# Wishlist Wizard Icon System

`icon-wishlist-wizard.svg` is the canonical, editable brand source. It uses a bold gift silhouette, a heart-shaped ribbon, and one gold magic sparkle. The icon intentionally contains no product name or initials so it remains legible from 16px browser controls through 1024px store artwork. `icon-wishlist-wizard-foreground.svg` is the safe-zone inset, transparent foreground used only for Android adaptive icons.

## Brand colors

- Icon green: `#004E36` (preserved from the original Wishlist Wizard icon)
- Interface emerald: `#047857`
- Deep emerald: `#065F46`
- Ivory: `#FFFDF7`
- Magic gold: `#F59E0B`

Do not recolor the primary mark purple or indigo, add text inside the icon, add extra sparkles, pre-round its outer corners, or place important artwork outside the established safe area.

## Regenerating deliverables

Render the vector master to a 1024px PNG and apply it across all platforms:

```bash
rsvg-convert --width 1024 --height 1024 \
  icons/icon-wishlist-wizard.svg \
  --output icons/icon-wishlist-wizard.png

NO_BACKUP=true ./scripts/apply-new-icon.sh \
  icons/icon-wishlist-wizard.png '#004E36'
```

The application script updates browser-extension, web/PWA, Android, iOS, macOS, and Windows deliverables, and synchronizes the canonical SVG to web and extension locations.
