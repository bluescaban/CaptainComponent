# ⚓ Captain Component

> AI-powered Figma plugin that analyzes any frame and auto-generates a full atomic design component library with variants, states, and dark/light themes using GPT-4o.

![Figma](https://img.shields.io/badge/Figma-Plugin-F24E1E?logo=figma&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?logo=openai&logoColor=white)

---

## What it does

Select any Frame in Figma, click **Analyze Frame**, and Captain Component uses GPT-4o to inspect the full node tree and identify every reusable UI element. It then programmatically builds a complete component library directly inside your Figma file — organized by atomic design level, with full variant grids, interactive states, and both light and dark themes.

No manual component creation. No copy-pasting. Just a finished design system ready to use.

---

## Features

- **AI analysis** — GPT-4o reads your frame's node tree and identifies atoms, molecules, and organisms
- **Full variant grids** — every component is built with all relevant variants (Primary, Secondary, Destructive, Ghost…)
- **Interactive states** — Default, Hover, Active, Focused, Disabled, Loading
- **Light & Dark themes** — all components generated in both modes
- **Size scales** — Small, Medium, Large where applicable
- **Auto Layout** — all components use Figma's native Auto Layout for responsive resizing
- **Native Figma Components** — uses Component Sets with proper variant properties
- **Clean naming** — every layer named to `ComponentType/Variant/State` convention, no "Frame 1234"
- **Atomic organization** — components placed in labeled section frames: Atoms, Molecules, Organisms

---

## Stack

| Layer | Technology |
|---|---|
| Plugin UI | React 18 + TypeScript |
| Plugin logic | Figma Plugin API |
| AI analysis | OpenAI GPT-4o (`gpt-4o`) |
| Build | Webpack 5 |

---

## Project structure

```
captain-component/
├── src/
│   ├── plugin/
│   │   ├── controller.ts         # Message router, Figma API entry point
│   │   ├── componentBuilder.ts   # Creates components, variant grids, section frames
│   │   ├── nodeSerializer.ts     # Serializes selected frame node tree to JSON
│   │   ├── variantGenerator.ts   # Generates variant × state × theme combinations
│   │   └── atomicOrganizer.ts    # Splits components by atomic level
│   ├── ui/
│   │   ├── App.tsx               # Main plugin UI + state machine
│   │   ├── components/
│   │   │   ├── FrameSelector.tsx # Selected frame info display
│   │   │   ├── AnalysisPanel.tsx # GPT-4o results summary
│   │   │   ├── ProgressBar.tsx   # Build progress indicator
│   │   │   └── ComponentList.tsx # Expandable list of identified components
│   │   ├── hooks/
│   │   │   ├── useOpenAI.ts      # GPT-4o API call + prompt
│   │   │   └── useFigmaSelection.ts # Tracks Figma selection changes
│   │   ├── env.d.ts              # Type declaration for __OPENAI_API_KEY__
│   │   └── styles/global.css     # Plugin UI styles
│   └── shared/
│       └── types.ts              # Shared TypeScript interfaces
├── public/
│   └── index.html
├── manifest.json
├── webpack.config.js
├── tsconfig.json
├── .env.example
└── .gitignore
```

---

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org) v18+
- [Figma desktop app](https://www.figma.com/downloads/)
- An [OpenAI API key](https://platform.openai.com/api-keys) with GPT-4o access

### 1. Clone and install

```bash
git clone https://github.com/bluescaban/CaptainComponent.git
cd CaptainComponent
npm install
```

### 2. Add your OpenAI key

```bash
cp .env.example .env
```

Open `.env` and replace the placeholder:

```
OPENAI_API_KEY=sk-proj-your-key-here
```

### 3. Build

```bash
npm run build
```

For watch mode during development:

```bash
npm run dev
```

### 4. Load in Figma

1. Open Figma desktop
2. Go to **Plugins → Development → Import plugin from manifest…**
3. Select `manifest.json` from this folder
4. Run the plugin from **Plugins → Development → Captain Component**

---

## Usage

1. **Select a Frame** in the Figma canvas
2. Click **Analyze Frame with GPT-4o** in the plugin panel
3. Review the identified components — expand each one to see variants and states
4. Click **Build N Components →**
5. Find your new component library on the **"Components"** page in your Figma file

---

## How the AI analysis works

The selected frame's full node tree is serialized (names, types, fills, typography, layout, effects, up to 6 levels deep) and sent to GPT-4o with a structured system prompt. The model returns a JSON array of `ComponentDefinition` objects:

```json
{
  "components": [
    {
      "name": "Button",
      "atomicLevel": "atom",
      "description": "Interactive button element",
      "variants": ["Primary", "Secondary", "Destructive", "Ghost"],
      "states": ["Default", "Hover", "Active", "Focused", "Disabled", "Loading"],
      "themes": ["Light", "Dark"],
      "sizes": ["Small", "Medium", "Large"],
      "sourceNodeId": "1:23",
      "properties": {
        "hasIcon": true,
        "hasLabel": true,
        "cornerRadius": 8
      }
    }
  ]
}
```

The plugin then builds each component programmatically using the Figma Plugin API.

---

## Development notes

- The **plugin controller** (`src/plugin/`) runs in Figma's sandboxed JS environment — no browser APIs, no `fetch`. All OpenAI calls are made from the UI iframe.
- The **plugin UI** (`src/ui/`) runs in a browser iframe inside Figma. It communicates with the controller via `postMessage`.
- The OpenAI API key is injected at build time from `.env` via webpack `DefinePlugin`. It is never committed to source control.
- The UI input field is pre-filled from the build-time key but can be overridden at runtime.

---

## License

MIT
