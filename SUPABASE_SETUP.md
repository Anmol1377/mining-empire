# Supabase setup

Supabase powers two things:

1. **Cloud sync** — your save state lives in `player_states`, written when you click ☁ Save to cloud
2. **Hall of Fame** — public leaderboard in `fame_entries`

If Supabase isn't configured, the game runs in local-only mode (Cloud save + Hall of Fame are disabled).

## Identity model (v3): file + cloud ID, no auth

There is **no login**. Each save has a randomly generated `cloudId` (UUID) embedded in it. That ID is the credential — anyone who has it can read/write that cloud row.

- **Cross-device** = Export the save file on device A, Import on device B. The cloudId travels with the file, so both devices write to the same cloud row.
- **Lost the file + cleared localStorage** = the cloud row exists but you can never reach it again. Treat the export as your master backup.
- **Reset** = brand-new cloudId. Old cloud row is orphaned (still exists, still in the database, but inaccessible to you).

This means **no email signup, no passwords, no Auth providers to enable**. Supabase Auth is unused.

## One-time setup

1. **Create a Supabase project** at <https://supabase.com> (free).

2. **Run the schema.** SQL Editor → New query → paste [`supabase-schema.sql`](./supabase-schema.sql) → Run. The script is destructive (drops prior `player_states` and `fame_entries`) — only an issue if you had real data; for first-time setup, no problem.

3. **Grab credentials.** Project Settings → API:
   - Project URL → `VITE_SUPABASE_URL`
   - `anon` / "Publishable" key → `VITE_SUPABASE_ANON_KEY`

4. **Create `.env.local`** in the repo root:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_...
   ```

5. **Restart `npm run dev`** so Vite picks up the env vars.

## Security model

The RPCs (`get_state`, `upsert_state`, `join_fame`, `bump_fame`) all take a `cloud_id` parameter and operate on that row only. RLS on the tables is set so **direct table access is denied** — clients can only reach data through the RPCs. The cloud_id is a 122-bit UUID; guessing somebody else's is statistically infeasible.

That said: **anyone who learns a cloud_id can write to that row.** Don't paste your save file in public chats.

## Reality check on cheating

Anyone who can call the API can write any state to their own cloud row, including faked coin counts. We can't prevent this without running the game simulation on the server. For a casual idle game this is fine; the leaderboard is honor-system regardless.

## Keepalive

Same as before — the workflow at [`.github/workflows/keepalive.yml`](./.github/workflows/keepalive.yml) pings daily. It hits the public `fame_entries` SELECT endpoint. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` as repo secrets if you want it active.
