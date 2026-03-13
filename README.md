# 🍳 Cookbook

A personal recipe app as an alternative to HelloFresh – simple meals with practical shopping lists for German supermarkets.

## The Idea

HelloFresh is convenient but expensive. The markup on ingredients is enormous. This app solves the same problem – simple recipes with clear shopping lists – without the premium price.

**Every day**, 10 new recipe suggestions are generated. You choose which ones to add to your personal recipe database. This way, your collection grows step by step.

## Features

- **📋 Daily Suggestions** – 10 new recipes per day to browse and select from
- **📖 Recipe Database** – All saved recipes, filterable by cuisine, store, and prep time
- **📦 Pantry Management** – Track ingredients you have at home; recipes automatically show what you still need to buy
- **🛒 Smart Shopping Lists** – Ingredients split into "You need to buy" and "Already in your pantry"
- **⚙️ Cuisine Preferences** – Set preferred cuisines (Asian, German, Italian, etc.)
- **📸 Recipe Photos** – Unsplash images or AI-generated photos
- **📱 Mobile-first** – Optimized for phone use with large touch targets

## Built for Real Shopping

- **Quantities for German supermarkets** – 300g chicken from the deli counter, 1 loose bell pepper, 1 can of tomatoes
- **Store per ingredient** – Discounter, supermarket, greengrocer, Asian grocery, deli counter
- **Pantry system** – Buy soy sauce once → it's marked as available in all recipes
- **Recipes with similar ingredients** – Bought a bag of potatoes? Here are 3 dishes for that

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | SvelteKit (Svelte 5) |
| Styling | Tailwind CSS |
| Database | SQLite (better-sqlite3) |
| Language | TypeScript |
| Build/Dev | Vite |

Everything in one project – SvelteKit serves both frontend and API routes. The database is a single SQLite file.

## Installation

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

The app will be running at `http://localhost:5173`.

### Prerequisites

- Node.js 18+
- npm

## Project Structure

```
cookbook/
├── data/                          # SQLite database (gitignored)
├── scripts/
│   └── seed.ts                    # 10 example recipes + pantry essentials
├── src/
│   ├── lib/
│   │   ├── server/db.ts           # Database setup and queries
│   │   ├── pantryMatch.ts         # Pantry matching logic
│   │   └── components/
│   │       ├── RecipeCard.svelte   # Recipe card with expandable details
│   │       ├── RecipeDetails.svelte# Ingredients + preparation steps
│   │       ├── ConfirmDialog.svelte# Confirmation dialogs
│   │       └── Toast.svelte        # Feedback notifications
│   └── routes/
│       ├── vorschlaege/           # Daily recipe suggestions
│       ├── rezepte/               # Recipe collection + detail view
│       ├── vorrat/                # Pantry management
│       ├── einstellungen/         # Cuisine preferences
│       └── api/                   # REST endpoints
│           ├── vorschlaege/       # GET daily suggestions
│           ├── vorschlaege/neu/   # POST insert new suggestions
│           ├── rezepte/           # GET/DELETE recipes
│           ├── rezepte/approve/   # POST approve recipes
│           ├── vorrat/            # GET/POST/DELETE pantry
│           └── einstellungen/     # GET/PUT preferences
└── vite.config.ts
```

## API

### Insert New Suggestions

```bash
POST /api/vorschlaege/neu

{
  "recipes": [
    {
      "name": "Pad Thai",
      "description": "Klassisches Thai-Nudelgericht",
      "cuisine": "Asiatisch",
      "cost_estimate": 6.50,
      "prep_time": 25,
      "difficulty": "Einfach",
      "image_url": "https://images.unsplash.com/photo-...",
      "ingredients": [
        {"name": "Reisnudeln", "amount": "200g", "store": "Asia-Laden"},
        {"name": "Hähnchenbrust", "amount": "300g", "store": "Theke"}
      ],
      "steps": ["Nudeln einweichen", "Hähnchen anbraten", "Zusammen schwenken"],
      "shopping_tags": ["Reisnudeln", "Hähnchen"],
      "store_category": "Asia-Laden"
    }
  ]
}
```

### Query Pantry

```bash
GET /api/vorrat
# → { items: [{ id: 1, name: "Salz" }, ...] }
```

### Query Preferences

```bash
GET /api/einstellungen
# → { cuisine_preferences: ["Asiatisch", "Deutsch", "Italienisch"] }
```

## License

Private project.
