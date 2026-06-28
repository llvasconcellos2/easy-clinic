# Data scripts

One-off maintenance scripts for the seeded MongoDB data (`meteor` database),
written while getting the archived app to run under Docker. They are idempotent
enough to re-run, and operate on the **running** stack (`docker compose up`).

All `.js` files are **mongo shell** scripts; run them against the `mongo`
service. `03-fix-images.sh` is a bash orchestration script (needs ImageMagick,
which the app image already has).

## Order

Run in numeric order on a freshly seeded database:

| # | Script | What it does |
|---|--------|--------------|
| 01 | `01-dedupe-cpf.js` | Merges patients that share a CPF (same person): keeps the most complete/recent record, backfills gaps, unions array history, deletes the rest. Snapshots the original to `patients_backup_predupe`. |
| 02 | `02-fill-cpf.js` | Fills patients without a CPF with random **valid** unique Brazilian CPFs. (First `$unset` explicit-null CPFs — see note in the file — so the unique+sparse index can build.) |
| 03 | `03-fix-images.sh` | Regenerates missing patient photos as a placeholder avatar and repairs the `Images` file paths/sizes to the container's storage dir. |
| 04 | `04-anonymize-patients.js` | Replaces real PII (name, email, phone, RG, address, `recommendedBy`, free-text `obs`) with realistic fake Brazilian data. Keeps the already-fake CPFs and non-identifying fields (city/state, DOB, gender, etc.). |
| 05 | `05-fill-emails.js` | Fills patients that have no email with a fake email derived from their (anonymized) name. |

## How to run

From the project root, with the stack up (`docker compose up -d`):

```bash
# mongo shell scripts
docker compose exec -T mongo mongo --quiet meteor < scripts/01-dedupe-cpf.js
docker compose exec -T mongo mongo --quiet meteor < scripts/02-fill-cpf.js
docker compose exec -T mongo mongo --quiet meteor < scripts/04-anonymize-patients.js

# image repair (bash + docker compose)
bash scripts/03-fix-images.sh
```

## Notes

- These edit data in the `mongo-data` volume. A `docker compose down -v` wipes it
  and re-seeds the **original** dump (`db-dump/`), so you'd re-run these. To make
  the cleaned state permanent, re-export the dump from the running DB.
- Related one-offs that are **not** scripts here:
  - Verifying the admin email so you can log in:
    `db.users.update({"emails.address":"leo.lima.web@gmail.com"},{$set:{"emails.$.verified":true}})`
  - Making image URLs relative (so photos load off `localhost`): source-code change
    in the client templates / `profile-pic-upload`, not a data script.
