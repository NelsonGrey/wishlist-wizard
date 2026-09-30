#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)

node "$repo_root/scripts/media-library/build-media-library.mjs"
python3 "$repo_root/scripts/media-library/sync-unified-media-library.py"
