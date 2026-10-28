# Data

Route lines drawn on wall models, and saved OpenBeta data, for the route drawing tool (`/author`). The models themselves live in the team's Supabase storage, which is also where the app loads models and route lines from ([ADR 0006](../docs/adr/0006-supabase-backend.md)). They used to be in a `models/` folder here, removed once they moved to Supabase.

| Path | What's there |
| --- | --- |
| `routes/` | Route lines drawn on a model, in `<model>.json` |
| `openbeta/` | A saved OpenBeta response for the test wall, from `scripts/openbeta/fetch-date-wall.mjs` ([openbeta.md](../docs/openbeta.md)). The author tool's route list comes from it |

## Demo data

Date Wall in Logan Canyon, Utah, is the only wall with a model so far. It was the proof of concept's test wall. To open it in the app, see [Things to try](../docs/setup.md#things-to-try).

Its model is published in Supabase as Date Wall's v1: 47 photos, 36 MB, 1M triangles and two 8K JPEG textures, with Smitten, Hooked and NCMO drawn (`routes/wall47.json`). `routes/crag16.json` holds lines for an earlier 16-photo model that was only used for comparison.

Date Wall has six routes on OpenBeta. Trix, The Flirt and Twitterpation aren't drawn, because they can't be placed on the current model (#35).

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

- `model` names the model the lines were drawn on. It's a path into the old `models/` folder, so for now it only identifies the model
- `points` are the holds the author clicked, from the start upward, in the model's own coordinates. `normals` point out of the rock at each one
- Every reconstruction has its own coordinates, so a routes file only fits the model it was drawn on. Rebuilding a wall's model means redrawing its routes
- Routes are matched to OpenBeta by `openbeta_uuid`, so a renamed route keeps its line

## Adding a wall

The route drawing tool and `npm run seed` both read models from the old `models/` folder, so adding a new wall waits until they load models from Supabase storage instead. Photographing a wall and making its model work as before: see the [capture checklist](../docs/capture-checklist.md) and [Make a wall model](../docs/setup.md#make-a-wall-model).

## Fixing route details

Route and area details (names, grades, length, bolts, descriptions, left-to-right order) come straight from [OpenBeta](https://openbeta.io), not from this folder. To fix or fill one in, edit it on openbeta.io. The data is CC0, so the fix helps every app that uses it, this one included.
