# Data

The files the app loads from this repo rather than from OpenBeta: wall models and the route lines drawn on them. The app reads this folder from `main` on GitHub, so a file here goes live once it's merged.

| Path | What's there |
| --- | --- |
| `models/` | Wall models, one self-contained `.glb` per reconstruction ([ADR 0005](../docs/adr/0005-wall-model-format.md)) |
| `models/index.json` | The models the author tool (`/author`) offers |
| `routes/` | Route lines drawn on a model, in `<model>.json` |
| `openbeta/` | A saved OpenBeta response for the test wall, from `scripts/openbeta/fetch-date-wall.mjs` ([openbeta.md](../docs/openbeta.md)). The author tool's route list comes from it |

## Demo data

Date Wall in Logan Canyon, Utah, is the only wall with a model so far. It was the proof of concept's test wall. To open it in the app, see [Try the demo](../README.md#try-the-demo).

| Model | Made from | Routes drawn | Used by |
| --- | --- | --- | --- |
| `wall47.glb` | Date Wall, 47 photos. 36 MB, 1M triangles, two 8K JPEG textures | Smitten, Hooked, NCMO | The Date Wall page |
| `crag16.glb` | Date Wall, 16 photos. 40 MB, 300k triangles, one 8K PNG texture | Hooked, NCMO | Only `/author`, for comparison |
| `wallpics01.glb` | Not recorded. 14 MB, 300k triangles, one JPEG texture | None | Only `/author` |

Date Wall has six routes on OpenBeta. Trix, The Flirt and Twitterpation aren't drawn, because they can't be placed on the current model (#35).

## models/index.json

```json
{
  "models": [
    { "file": "wall47.glb", "name": "Date Wall · 47 photos (sets 16 + 31)", "notes": "1M triangles, two 8K textures" }
  ]
}
```

- `file`: the GLB in `models/`
- `name`: what the author tool's model picker shows. Optional, and the file name is used without it
- `notes`: shown under the model's stats in the author tool. Optional

## routes/\<model\>.json

Written by the author tool and checked by `scripts/viewer/serve.mjs` when it saves. The types are in `mobile/src/core/routes-file.ts`.

```json
{
  "model": "data/models/wall47.glb",
  "area": { "name": "Date Wall", "openbeta_uuid": "8c45d40d-363d-5a9b-9659-3df50c5d3916" },
  "updated": "2026-10-21T17:00:00.000Z",
  "routes": [
    {
      "openbeta_uuid": "<the route's OpenBeta uuid>",
      "name": "Smitten",
      "grade": "5.9+",
      "points": [[0.1234, 1.5, -0.25]],
      "normals": [[0, 0, 1]]
    }
  ]
}
```

- `points` are the holds the author clicked, from the start upward, in the model's own coordinates. `normals` point out of the rock at each one
- Every reconstruction has its own coordinates, so a routes file only fits the model it was drawn on. Rebuilding a wall's model means redrawing its routes
- Routes are matched to OpenBeta by `openbeta_uuid`, so a renamed route keeps its line

## Adding a wall

1. **Photograph it** with the [capture checklist](../docs/capture-checklist.md)
2. **Make the model** with `scripts/realityscan/run.reproject.ps1` ([Making a wall model](../README.md#making-a-wall-model)) and copy the finished `.glb` into `models/`. Keep it to 15 MB or less
3. **List it** in `models/index.json`
4. **Draw the routes.** Start the author tool ([Drawing routes](../mobile/README.md#drawing-routes)), open `http://localhost:8081/author?model=<file>.glb`, draw each route and click **Save routes**. That writes `routes/<file>.json`. The author tool's route list comes from `openbeta/date-wall.json`, so today it only lists Date Wall's routes. A new wall needs the tool to load that wall's routes first, which isn't built yet
5. **Add the wall to the app** with an entry in `WALLS` in [`mobile/src/core/walls.ts`](../mobile/src/core/walls.ts). That one entry is all the app needs:

   ```ts
   {
     id: 'date-wall', // the page URL, /walls/date-wall
     name: 'Date Wall',
     areaUuid: '8c45d40d-363d-5a9b-9659-3df50c5d3916', // the wall's OpenBeta area
     model: 'wall47.glb', // file in data/models/
     routes: 'wall47.json', // file in data/routes/
   },
   ```

   `areaUuid` is the last part of the wall's area page URL, in the app (`/area/<uuid>`) or on openbeta.io. The entry adds "View the wall in 3D" to the area page and "See it on the 3D wall" to its route pages, and marks the wall 3D on the map
6. **Check it** at `http://localhost:8081/walls/<id>` with `serve.mjs` running, then open a pull request. Phones show the wall once it's merged to `main`

## Fixing route details

Route and area details (names, grades, length, bolts, descriptions, left-to-right order) come straight from [OpenBeta](https://openbeta.io), not from this folder. To fix or fill one in, edit it on openbeta.io. The data is CC0, so the fix helps every app that uses it, this one included.
