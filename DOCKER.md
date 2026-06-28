# Running Clínica Fácil with Docker

This project is a legacy [Meteor](https://www.meteor.com/) **1.4.1.3** app backed
by **MongoDB**. The Docker setup runs Meteor in dev mode against a MongoDB
container and auto-seeds the database from the bundled dump.

## Prerequisites

- Docker Engine + the `docker compose` plugin (Compose v2).

## Quick start

```sh
docker compose up --build
```

Then open <http://localhost:3000>.

> The **first build is slow** — it downloads Meteor's 1.4.1.3 dev bundle
> (~500 MB) and compiles the native `bcrypt` module. Later runs reuse the cache.

## What the stack does

| Service | Image / Build | Role |
| ------- | ------------- | ---- |
| `mongo` | `mongo:3.2`   | Database (matches Meteor 1.4's bundled Mongo). Data persists in the `mongo-data` volume. |
| `seed`  | `mongo:3.2`   | One-shot: restores the cleaned + anonymized `db/meteor` dump into the `meteor` DB **only if it is empty**. |
| `app`   | `./Dockerfile`| The Meteor dev server on port 3000. Connects to Mongo via `MONGO_URL`. |

## Common commands

```sh
docker compose up --build          # build + start everything
docker compose up -d               # start in the background
docker compose logs -f app         # follow the Meteor server logs
docker compose down                # stop and remove containers (keeps data)
docker compose down -v             # also wipe the Mongo + build-cache volumes
```

## Re-seeding from scratch

```sh
docker compose down -v             # drop the mongo-data volume
docker compose up --build          # the seed job repopulates the empty DB
```

## Notes

- The app reads `app/config/settings.json` via `--settings` (public
  stale-session timeouts).
- `ROOT_URL` defaults to `http://localhost:3000`; change it in
  `docker-compose.yml` if you serve the app from another host.
- Meteor's build cache lives in the `meteor-local` volume so restarts don't
  recompile from scratch.
