#!/bin/bash
set -e

echo "🔨 Building for Capacitor..."

BACKUP_DIR=$(mktemp -d)
echo "  Backup dir: $BACKUP_DIR"

# 1. Move +page.server.ts files out
find src/routes -name "+page.server.ts" | while read f; do
  mkdir -p "$BACKUP_DIR/$(dirname "$f")"
  mv "$f" "$BACKUP_DIR/$f"
  echo "  Removed server: $f"
done

# 2. Move +server.ts (API routes) out
find src/routes/api -name "+server.ts" | while read f; do
  mkdir -p "$BACKUP_DIR/$(dirname "$f")"
  mv "$f" "$BACKUP_DIR/$f"
  echo "  Removed API: $f"
done

# 3. Replace +page.ts files that import from $types (server dependency)
find src/routes -name "+page.ts" | while read f; do
  if grep -q "from '\.\./\$types'\|from '\./\$types'" "$f" 2>/dev/null; then
    mkdir -p "$BACKUP_DIR/$(dirname "$f")"
    cp "$f" "$BACKUP_DIR/$f"
    # Replace with a simple load that returns empty defaults
    cat > "$f" << 'PAGETS'
export const ssr = false;
export function load({ data }) {
  return data ?? {};
}
PAGETS
    echo "  Simplified: $f"
  fi
done

# Build
CAPACITOR=true npm run build

# Restore all files
find "$BACKUP_DIR" -type f | while read f; do
  ORIG="${f#$BACKUP_DIR/}"
  mkdir -p "$(dirname "$ORIG")"
  mv "$f" "$ORIG"
done
rm -rf "$BACKUP_DIR"

echo "✅ Capacitor build complete!"

# Sync with platforms
npx cap sync
echo "✅ Synced with native platforms!"
echo ""
echo "📱 To deploy to iOS Simulator WITHOUT losing data:"
echo "   xcodebuild -project ios/App/App.xcodeproj -scheme App -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build"
echo "   xcrun simctl install 'iPhone 17 Pro' ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphonesimulator/App.app"
echo "   xcrun simctl launch 'iPhone 17 Pro' app.cokko"
echo ""
echo "⚠️  Do NOT use 'simctl uninstall' — it deletes all app data (IndexedDB)!"
