<img src="./src/assets/mapcursor-logo-original.svg" alt="Mapcursor" width="180" />

# Mapcursor

Draw and annotate on maps. Open a canvas, drop a few points, trace a route, circle a neighbourhood — no signup, no setup, no empty-state tutorial to click through.

<!--
    Demo GIF goes here. Record a short loop (10–15s) of opening a map, dropping
    a couple of points, drawing a route and a radius circle, then drop it at the
    path below. A moving picture sells this far better than any paragraph can.
-->

<!-- ![Mapcursor demo](./src/assets/mapcursor-demo.gif) -->

## What it is

I wanted a way to mark things up on a map that gets out of the way. Most tools make you sign in, pick a project, or learn a GIS toolbar before you can point at a street. Mapcursor opens straight onto a map — you drop a pin, draw a line along a route, shade an area, and that's the whole pitch. Your data stays on your machine unless you choose to share the canvas.

Things you can do on a base:

- **Point** — drop a pin and name it
- **Route** — trace a polyline, with optional snapping to the road network underneath
- **Area** — shade a polygon over a neighbourhood or a zone
- **Radius map** — a circle that holds a real-world radius as you zoom
- **Pencil** — freehand sketch over the map
- **Text** — annotate anywhere, at a size that stays legible as the world zooms out
- Group elements, erase, reorder, undo and redo
- Style what you draw — stroke, fill, width, dashes, colour, opacity
- **Legend presets** — define a caption once, bind elements to it, and restyling the preset repaints every element carrying it
- Search for a place to jump to
- Export the visible viewport as a **PNG**, or export and import a whole canvas as **JSON** or **SVG**
- Share a base with a link

A fair warning: I work on this mostly on weekends, so expect the occasional bug or rough edge. If you hit one — or have an idea, or just want a feature — please [open an issue](https://github.com/meetzaveri/mapcursor/issues). I read all of them.

## How it's built

Mapcursor renders its annotations with [two.js](https://github.com/jonobr1/two.js), a lovely 2D scene-graph library by [Jono Brandel](https://github.com/jonobr1), layered over a [MapLibre](https://maplibre.org/) basemap. Two.js draws the ink; React drives the UI and state around it.

The central concept is the **base** — the workspace itself. It owns the map, the canvas, the sidebar and the toolbars. Rendering flows down a small chain:

```
Base → Canvas → ElementRenderer → Component Element → Component Factory
```

Canvas holds the 2D rendering logic and all the interaction handling — mouse, drag, zoom, pan — which is what makes a canvas feel alive to draw on. Each kind of element (a point, a route, a pencil stroke) has a **factory** that produces its template definition, and a matching React **component** that mounts it into the scene and wires up its event listeners.

The interesting part is how ink and map stay married. Elements live in Two.js's own surface space and their coordinates are **never rewritten**. Instead the map is jumped so that surface (0,0) always sits over the base's geographic anchor, and the map's zoom tracks the canvas camera. That one equation is what makes an annotation behave as though it were pinned to the ground.

State is shared through React Context (`BaseContext`) rather than a global store. The stack is React + TypeScript, Vite for the build, Two.js and MapLibre for rendering, and Apollo + Hasura (GraphQL) for the backend.

## Running it locally

Mapcursor is the frontend. The backend lives in a separate repo, [mapcursor-hasura](https://github.com/meetzaveri/mapcursor-hasura). You'll need both running to use the full app locally.

### Backend

Follow the setup steps in the [mapcursor-hasura README](https://github.com/meetzaveri/mapcursor-hasura) to get the backend running.

### Frontend

Clone this repo and install dependencies:

```bash
yarn
```

Create a `.env` file in the project root and copy the contents of `.envexample` into it.

Then start the dev server:

```bash
yarn start
```

This runs Vite and serves the app at [http://localhost:5173](http://localhost:5173). The page hot-reloads as you edit, and type/lint errors show up in your terminal.

Other useful scripts:

```bash
yarn build       # production build into ./dist
yarn preview     # serve the production build locally
yarn typecheck   # tsc --noEmit
yarn test        # unit tests (vitest)
yarn test:e2e    # end-to-end tests (playwright)
```

## Perf test

Before 0.8.3

```
     1200 mixed elems (0.97 MB) | settle   3512 ms | blocking   2043 ms | svg nodes 7817 | selectable nodes 1200
     3000 mixed elems (2.43 MB) | settle  15629 ms | blocking  14242 ms | svg nodes 19517 | selectable nodes 3000
```

## Contributing

Issues and pull requests are welcome — features, suggestions, and bug reports all count. It's a weekend project, so I appreciate the patience and the company.
