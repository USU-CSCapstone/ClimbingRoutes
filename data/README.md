# Data

Working copies of wall models and the route lines drawn on them. The route drawing tool (`/author`) reads and saves these files, and walls are published from them to the team's Supabase project, where the app loads them from ([ADR 0006](../docs/adr/0006-supabase-backend.md)).

| Path | What's there |
| --- | --- |
| `models/` | Wall models, one self-contained `.glb` per reconstruction ([ADR 0005](../docs/adr/0005-wall-model-format.md)) |
| `models/index.json` | The models the author tool (`/author`) offers |
| `routes/` | Route lines drawn on a model, in `<model>.json` |
| `openbeta/` | A saved OpenBeta response for the test wall, from `scripts/openbeta/fetch-date-wall.mjs` ([openbeta.md](../docs/openbeta.md)). The author tool's route list comes from it |

## Demo data

Date Wall in Logan Canyon, Utah, is the only wall with a model so far. It was the proof of concept's test wall. To open it in the app, see [Things to try](../docs/setup.md#things-to-try).

| Model | Made from | Routes drawn | Used by |
| --- | --- | --- | --- |
| `wall47.glb` | Date Wall, 47 photos. 36 MB, 1M triangles, two 8K JPEG textures | Smitten, Hooked, NCMO | Published as Date Wall's v1, which the Date Wall page shows |
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
2. **Make the model** with `scripts/realityscan/run.reproject.ps1` ([Make a wall model](../docs/setup.md#make-a-wall-model)) and copy the finished `.glb` into `models/`. Keep it to 15 MB or less
3. **List it** in `models/index.json`
4. **Draw the routes.** Start the author tool ([Drawing routes](../mobile/README.md#drawing-routes)), open `http://localhost:8081/author?model=<file>.glb`, draw each route and click **Save routes**. That writes `routes/<file>.json`. The author tool's route list comes from `openbeta/date-wall.json`, so today it only lists Date Wall's routes. A new wall needs the tool to load that wall's routes first, which isn't built yet
5. **Publish it** as the wall's first version: from `supabase/`, run `npm run seed -- ../data/routes/<file>.json`. It signs in as the moderator account ([Backend setup](../docs/setup.md#backend)), uploads the model and adds its route lines. The routes file's `area.openbeta_uuid` says which wall it is, and a wall that already has a version is left alone. Once published, the wall's area page offers "View in 3D" and the map marks it 3D
6. **Check it** at `http://localhost:8081/walls/<area uuid>`, then open a pull request with the files in `data/` so the drawing tool has them

## Fixing route details

Route and area details (names, grades, length, bolts, descriptions, left-to-right order) come straight from [OpenBeta](https://openbeta.io), not from this folder. To fix or fill one in, edit it on openbeta.io. The data is CC0, so the fix helps every app that uses it, this one included.
