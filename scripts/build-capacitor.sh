#!/bin/bash
set -e

echo "🔨 Building for Capacitor..."

# Move server files out of the way entirely
BACKUP_DIR=$(mktemp -d)
echo "  Backup dir: $BACKUP_DIR"

find src/routes -name "+page.server.ts" | while read f; do
  mkdir -p "$BACKUP_DIR/$(dirname "$f")"
  mv "$f" "$BACKUP_DIR/$f"
  echo "  Removed: $f"
done

# Build
CAPACITOR=true npm run build

# Restore server files
find "$BACKUP_DIR" -name "+page.server.ts" | while read f; do
  ORIG="${f#$BACKUP_DIR/}"
  mv "$f" "$ORIG"
done
rm -rf "$BACKUP_DIR"

echo "✅ Capacitor build complete!"

# Sync with platforms
npx cap sync
echo "✅ Synced with native platforms!"
