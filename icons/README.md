# Icons Directory

This directory contains the canonical icon assets for the Wishlist Wizard project:

- `icon-wishlist-wizard.png` — master PNG (raster)
- `icon-wishlist-wizard.svg` — master SVG (vector) or embedded PNG SVG if vectorization unavailable

Guidelines
- Use these master files as the source of truth for generating platform-specific icons.
- Use the repository script for automated generation and distribution of platform icons:
  ```bash
  ./scripts/apply-new-icon.sh icons/icon-wishlist-wizard.png
  ```
- If you need a true vector master, edit `icons/icon-wishlist-wizard.svg` (if it is actually vector) or replace it with a clean SVG design from design tooling (Figma/Sketch/Illustrator).
