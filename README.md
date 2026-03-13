# 🍳 Cookbook

Eine persönliche Rezept-App als Alternative zu HelloFresh – einfache Gerichte mit praktischen Einkaufslisten für deutsche Supermärkte.

## Idee

HelloFresh ist bequem, aber teuer. Die Gewinnspanne auf die Zutaten ist enorm. Diese App löst das gleiche Problem – einfache Rezepte mit klaren Einkaufslisten – ohne den Aufpreis.

**Jeden Tag** werden 10 neue Rezeptvorschläge generiert. Du wählst aus, welche in deine persönliche Rezeptdatenbank übernommen werden. So wächst deine Sammlung Stück für Stück.

## Features

- **📋 Tägliche Vorschläge** – 10 neue Rezepte pro Tag zum Durchblättern und Auswählen
- **📖 Rezeptdatenbank** – Alle übernommenen Rezepte, filterbar nach Küche, Einkaufsort und Zubereitungszeit
- **📦 Vorratsverwaltung** – Zutaten die du zuhause hast pflegen; Rezepte zeigen automatisch was du noch kaufen musst
- **🛒 Smarte Einkaufslisten** – Zutaten getrennt in "Das brauchst du" und "Hast du im Vorrat"
- **⚙️ Küchen-Präferenzen** – Bevorzugte Küchen einstellen (Asiatisch, Deutsch, Italienisch, etc.)
- **📸 Rezeptfotos** – Unsplash-Bilder oder KI-generierte Fotos
- **📱 Mobile-first** – Optimiert für Handy-Bedienung mit großen Touch-Targets

## Praktisch gedacht

- **Mengen für deutsche Supermärkte** – 300g Hähnchen von der Theke, 1 Paprika lose, 1 Dose Tomaten
- **Einkaufsort pro Zutat** – Discounter, Supermarkt, Gemüsehändler, Asia-Laden, Theke
- **Vorrat-System** – Sojasoße einmal kaufen → wird in allen Rezepten als vorhanden markiert
- **Rezepte mit ähnlichen Zutaten** – Kartoffelsack gekauft? Hier sind 3 Gerichte dafür

## Tech-Stack

| Komponente | Technologie |
|------------|-------------|
| Frontend | SvelteKit (Svelte 5) |
| Styling | Tailwind CSS |
| Datenbank | SQLite (better-sqlite3) |
| Sprache | TypeScript |
| Build/Dev | Vite |

Alles in einem Projekt – SvelteKit liefert Frontend und API-Routes. Die Datenbank ist eine einzelne SQLite-Datei.

## Installation

```bash
# Repository klonen
git clone git@github.com:mahype/cookbook.git
cd cookbook

# Dependencies installieren
npm install

# Datenbank mit Beispielrezepten befüllen
npm run seed

# Entwicklungsserver starten
npm run dev
```

Die App läuft dann unter `http://localhost:5173`.

### Voraussetzungen

- Node.js 18+
- npm

## Projektstruktur

```
cookbook/
├── data/                          # SQLite-Datenbank (gitignored)
├── scripts/
│   └── seed.ts                    # 10 Beispielrezepte + Vorrats-Grundausstattung
├── src/
│   ├── lib/
│   │   ├── server/db.ts           # Datenbank-Setup und Queries
│   │   ├── pantryMatch.ts         # Vorrat-Matching-Logik
│   │   └── components/
│   │       ├── RecipeCard.svelte   # Rezeptkarte mit Aufklapp-Details
│   │       ├── RecipeDetails.svelte# Zutaten + Zubereitungsschritte
│   │       ├── ConfirmDialog.svelte# Bestätigungs-Dialoge
│   │       └── Toast.svelte        # Feedback-Benachrichtigungen
│   └── routes/
│       ├── vorschlaege/           # Tägliche Rezeptvorschläge
│       ├── rezepte/               # Rezeptsammlung + Detailansicht
│       ├── vorrat/                # Vorratsverwaltung
│       ├── einstellungen/         # Küchen-Präferenzen
│       └── api/                   # REST-Endpoints
│           ├── vorschlaege/       # GET Tagesvorschläge
│           ├── vorschlaege/neu/   # POST neue Vorschläge einfügen
│           ├── rezepte/           # GET/DELETE Rezepte
│           ├── rezepte/approve/   # POST Rezepte übernehmen
│           ├── vorrat/            # GET/POST/DELETE Vorrat
│           └── einstellungen/     # GET/PUT Präferenzen
└── vite.config.ts
```

## API

### Neue Vorschläge einfügen

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

### Vorrat abfragen

```bash
GET /api/vorrat
# → { items: [{ id: 1, name: "Salz" }, ...] }
```

### Präferenzen abfragen

```bash
GET /api/einstellungen
# → { cuisine_preferences: ["Asiatisch", "Deutsch", "Italienisch"] }
```

## Lizenz

Privates Projekt.
