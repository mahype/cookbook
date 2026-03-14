# 🍳 Cookbook

A personal recipe app as an alternative to HelloFresh – simple meals with practical shopping lists for German supermarkets. Powered by AI for recipe generation and image creation.

## Quick Start (Local Development)

### Prerequisites

- **Node.js 18+** and **npm**
- **Git**

### Setup

```bash
# Clone the repository
git clone git@github.com:mahype/cookbook.git
cd cookbook

# Install dependencies
npm install

# Seed the database with example recipes
npm run seed

# Start the development server
npm run dev
```

The app runs at **http://localhost:5178**.

### AI Features (Optional)

To enable AI recipe generation, configure a provider in the app:

1. Open the app → **Einstellungen** (Settings)
2. Scroll to **KI-Einstellungen**
3. Select a provider (OpenAI, Anthropic, etc.) and enter your API key
4. Test the connection

## Native App (iOS & Android)

The app can run as a native mobile app via [Capacitor](https://capacitorjs.com/).

### iOS (Simulator & Device)

**Prerequisites:**
- macOS
- [Xcode](https://apps.apple.com/app/id497799835) (free from App Store, ~12 GB)
- After install: `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`
- Accept the license: `sudo xcodebuild -license accept`

**Build & Run:**

```bash
# Build for Capacitor (uses adapter-static, stubs server modules)
bash scripts/build-capacitor.sh

# Build the iOS project
cd ios/App
xcodebuild -project App.xcodeproj -scheme App \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -configuration Debug build

# Run in Simulator
xcrun simctl boot "iPhone 17 Pro"  # or any available simulator
open -a Simulator
xcrun simctl install booted ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphonesimulator/App.app
xcrun simctl launch booted de.cookbook.app
```

**Or via Xcode GUI:**

```bash
npx cap open ios
```

Then select a simulator or connected device and press ▶️.

**On a real iPhone (free, no Developer Account needed):**
1. Connect iPhone via USB
2. Open Xcode: `npx cap open ios`
3. Select your iPhone as build target
4. Press ▶️ (you may need to trust the developer profile on the iPhone under Settings → General → VPN & Device Management)

**For App Store distribution:**
- Apple Developer Account required (99€/year)
- TestFlight for beta testing

### Android (Emulator & Device)

**Prerequisites:**
- [Android Studio](https://developer.android.com/studio) (free, ~1.5 GB)
- During install, make sure to include: Android SDK, Android Virtual Device (AVD)

**Setup (first time):**

```bash
# After Android Studio is installed, add platform tools to PATH
# (add to ~/.zshrc or ~/.bashrc)
export ANDROID_HOME=$HOME/Library/Android/sdk   # macOS
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/emulator

# Create an emulator (or do it via Android Studio → Virtual Device Manager)
# Android Studio → More Actions → Virtual Device Manager → Create Device
# Recommended: Pixel 8, API 34 (Android 14)
```

**Build & Run:**

```bash
# Build for Capacitor
bash scripts/build-capacitor.sh

# Open in Android Studio
npx cap open android
```

Then select an emulator or connected device and press ▶️.

**On a real Android phone:**
1. Enable Developer Options: Settings → About Phone → tap "Build Number" 7 times
2. Enable USB Debugging: Settings → Developer Options → USB Debugging
3. Connect phone via USB, allow debugging when prompted
4. Select your device in Android Studio and press ▶️

**For Play Store distribution:**
- Google Play Console account required (25€ one-time)

### Build Scripts

```bash
npm run dev              # Start dev server (web, with hot reload)
npm run build            # Production build (web)
npm run build:cap        # Capacitor build + sync (CAPACITOR=true)
bash scripts/build-capacitor.sh  # Full native build (stubs server, syncs platforms)
```

## Features

- **🤖 AI Recipe Generation** – Generate personalized recipes based on your pantry, preferences, and cuisine ratings
- **📋 Recipe Suggestions** – Browse AI-generated suggestions, approve or dismiss them
- **📖 Recipe Database** – All saved recipes, sortable by newest, pantry match, cost, speed, simplicity
- **📦 Pantry Management** – Track what you have; recipes show pantry matches
- **🛒 Shopping Lists** – Auto-generated, categorized by store type
- **⭐ Cuisine Preferences** – Rate cuisines 1-3 stars across 5 categories (37 cuisines)
- **👥 Persons & Meal Planning** – Household members with dietary preferences, pass-the-phone voting
- **🍽️ Adjustable Servings** – Scale ingredients with a stepper (fractions like ½ displayed nicely)
- **📸 AI Food Photos** – DALL-E 3 with vision-based validation
- **🔌 Multi-Provider AI** – OpenAI, Anthropic, Mistral, OpenRouter, Ollama, Custom (OpenAI-compatible)
- **📱 Native iOS & Android** – Via Capacitor with offline-capable client-side SQLite

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | SvelteKit (Svelte 5) with Runes |
| Styling | Tailwind CSS v4 |
| Database (web) | SQLite via better-sqlite3 |
| Database (native) | SQLite via sql.js (WASM) |
| Native wrapper | Capacitor |
| Language | TypeScript |
| Build | Vite |

### Architecture

**Web mode:** SvelteKit with server-side rendering, better-sqlite3 for the database, API routes for data access.

**Native mode (Capacitor):** SvelteKit with adapter-static (SPA), sql.js (SQLite compiled to WASM) running in the browser, all data stored in IndexedDB. No server needed – the app works fully offline.

The dual-mode architecture is handled by `src/lib/stores/data.ts` which detects the environment and routes data calls accordingly.

## Project Structure

```
cookbook/
├── scripts/
│   ├── seed.ts                     # Database seeder
│   └── build-capacitor.sh          # Native build script
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── db.ts               # Server-side SQLite (better-sqlite3)
│   │   │   └── ai.ts               # Multi-provider AI abstraction
│   │   ├── client/
│   │   │   ├── db.ts               # Client-side SQLite (sql.js/WASM)
│   │   │   ├── ai-recipes.ts       # Client-side AI recipe generation
│   │   │   └── ai-images.ts        # DALL-E image generation + validation
│   │   ├── stores/
│   │   │   └── data.ts             # Dual-mode data layer (server vs client)
│   │   ├── stubs/
│   │   │   └── better-sqlite3.ts   # Mock for Capacitor builds
│   │   ├── pantryMatch.ts          # Pantry matching utility
│   │   └── components/
│   │       ├── RecipeCard.svelte    # Recipe card (approve, dismiss, expand)
│   │       ├── RecipeDetails.svelte # Ingredients + steps
│   │       ├── TabToggle.svelte     # Tab switcher
│   │       └── StepIndicator.svelte # Multi-step wizard
│   └── routes/
│       ├── rezepte/                # Recipes (suggestions + saved, tab toggle)
│       ├── lebensmittel/           # Shopping list + pantry (tab toggle)
│       ├── einstellungen/          # Settings (preferences, AI, servings)
│       ├── planen/                 # Meal planning + voting
│       └── api/                    # REST endpoints (web mode only)
├── ios/                            # iOS project (gitignored, generated)
├── android/                        # Android project (gitignored, generated)
├── capacitor.config.ts             # Capacitor configuration
├── svelte.config.js                # SvelteKit config (dual adapter)
└── vite.config.ts                  # Vite config (with Capacitor alias)
```

## License

Private project.
