# Icons Directory

This directory contains the canonical icon assets for the Wishlist Wizard project:


Guidelines
  ```bash
  ./scripts/apply-new-icon.sh icons/icon-wishlist-wizard.png
  ```
If you need a true vector master, edit `icons/icon-wishlist-wizard.svg` (if it is actually vector) or replace it with an SVG from a design tool. If you only have a PNG and want to attempt automatic vectorization, install the following tools locally:

- macOS: brew install potrace imagemagick
- Linux (Ubuntu): sudo apt-get install potrace imagemagick

Then run:
```bash
# Attempt vectorization with potrace (preferred) or fallback to an embedded PNG SVG
./scripts/convert-png-to-svg.sh icons/icon-wishlist-wizard.png icons/icon-wishlist-wizard.svg
```
