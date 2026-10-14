# `prisma/migrations` — current state and what you still have to decide

## Read this first: nothing here has been applied

`0_init/migration.sql` is a **generated record of the schema that already exists on the live Neon
database**, produced offline with:

```bash
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
```

It is additive-only — 37 `CREATE TABLE`, 8 `CREATE TYPE`, 108 index statements, and **zero `DROP`
statements** — but it has not been run against any database, and this repository has never contained
a `prisma/migrations` directory, so no migration history has been recorded for it. Confirm the live
state with `npx prisma migrate status` once the database is reachable again (it currently is not —
that check is a separate problem, not a missing-file problem).

**`buildCommand` and `startCommand` in `render.yaml` were deliberately left unchanged.** They still
run `npx prisma generate` (client codegen only, applies no schema). Adding `prisma migrate deploy`
before baselining would try to execute `0_init` against a database that already has those tables and
fail every deploy with `relation "Sector" already exists`.

## Why the history is empty

The Neon database was built with `prisma db push`, which syncs the schema and records no migration
history. So the schema on the branch named in `.neon` exists, but Prisma Migrate has nothing to
compare it against. That is the whole reason a baseline is needed before `migrate deploy` can be used.

## Prerequisite for both paths: use the direct URL

Neon's pooled endpoint (`-pooler` hostname) is PgBouncer in transaction mode. Migration commands over
it fail with errors that never mention pooling — `prepared statement "s0" already exists`, or
`relation ... does not exist` after a `SET search_path` that did not persist. Use
`DATABASE_URL_UNPOOLED` for everything below, and keep the pooled URL for application traffic.

## Path A — baseline the existing database (keeps current data)

```bash
# 1. create _prisma_migrations and record 0_init as already applied, without running its SQL
npx prisma migrate resolve --applied 0_init    # with DATABASE_URL set to the direct URL

# 2. confirm the history is clean
npx prisma migrate status
```

`prisma migrate resolve` exists precisely for baselining an existing database. Step 1 does not
execute `0_init`; it only inserts a row. After that, `prisma migrate deploy` is safe to add to the
deploy pipeline for *future* migrations.

## Path B — treat the baseline as the source of truth (destructive, cleaner)

```bash
npx prisma migrate deploy    # against a fresh, empty Neon branch
```

Provisions the schema from `0_init` on an empty branch with no baselining step, then you point
`DATABASE_URL` at that branch and re-seed (`npx prisma db seed`). **This discards whatever lives on
the current branch** — only viable if that data is disposable.

## Still missing either way

`package.json` has no `"prisma": { "seed": ... }` block, so `npx prisma db seed` does not pick up
`prisma/seed.ts` as written; it currently has to be run through `tsx` directly. And `agent.md`'s rule
that every schema change ships a committed migration is not enforceable until one of the two paths
above is chosen — until then `db push` remains the de facto mechanism, which is what this folder
exists to replace.
