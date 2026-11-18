# Security model — CORO SOLTO: Treta Suprema

## The technical truth first

This is a game **without an authoritative server** (for now): matches run
100% in the player's browser. This means that **the client is, by definition,
untrusted** — an attacker with a trainer (memory/JS editing, like the one in
the pentester's screenshot) can get god mode, speed, autoshot, etc. in their OWN
game. **No client-side anti-cheat can stop this** — it is obfuscation theater,
and we do not do theater.

What we can genuinely defend today is **ranking integrity** — and that is
where we focus everything: statistical validation and server-side moderation.

The real fix is authoritative multiplayer (a future phase), where the server
witnesses kills. Until then, we use the layers below.

## Active layers

1. **Token per nickname** (UUID in the browser) — prevents theft of other players' nicknames/stats.
2. **Rate limit per nickname** (90s) and **per IP** (60s + 200 matches/day, via
   `submit_log`) — protects against floods and nick-hopping.
3. **Absolute caps** — 150 kills/deaths, streak of 30, 1,500s per match.
4. **Physical consistency (anti-trainer)**:
   - kills ≤ 45 per round (the 2.2s respawn makes anything higher impossible);
   - ≥ 80s per round (a speed hack cannot produce an instant match).
5. **Automatic flags** — an implausible attempt = +1 flag; **3 flags = automatic
   removal from the ranking** (`players.hidden`).
6. **Rate-limited registration** (10/min per IP) against nick-farming.
7. **RLS on every table**; writes only through validated RPCs; the `service_role`
   key exists only in Vercel environment variables.
8. **No secrets in the client** — the anon key is public by design. But RLS alone
   was not enough: it filters ROWS, not COLUMNS, and does not cover function
   `execute`. See 9 and 10.
9. **`players.token` restricted by column privilege** (migration 011 §1). Until
   v2, the anon key could read `select=nick,token` for the entire ranking — which
   is exactly the pair that `submit_match` validates. The ranking could be forged
   with a single `curl`.
10. **No RPC is callable by the anon key** (migration 011 §4). Every Postgres
    function is created with `execute` for PUBLIC, and PostgREST publishes each one
    at `/rest/v1/rpc/<nome>`: anyone could call `_flag` three times and hide any
    player from the ranking, without any token.
11. **Durable rate limiting in Postgres** (migration 011 §3). A limit stored in a
    lambda's in-memory `Map` does not survive a cold start — see `docs/seguranca.md` §3.
12. **Anti-SSRF** on every URL fetched by the server (`src/lib/safe-url.ts`).
13. **Security headers** sourced from `borda.json`: CSP, nosniff, Referrer-Policy,
    Permissions-Policy, HSTS.

## LGPD (Brazil's data protection law) / privacy

- `submit_log` stores IP + nickname + timestamp **only** for operational
  security (anti-abuse), with a **maximum retention of 7 days**. This promise now
  has a job: `public.purge_submit_log(7)`, scheduled daily in `pg_cron`
  (migration 011 §2). Until v2, nothing enforced this retention.
- Map geolocation is city-level (Vercel header); the IP is never persisted for it.

## Moderation (ready-to-use SQL)

```sql
-- esconder um jogador do ranking
update players set hidden = true where nick = 'NICK';
-- desbanir + zerar flags
update players set hidden = false, flagged_count = 0 where nick = 'NICK';
-- suspeitos acumulando flags
select nick, flagged_count, hidden from players where flagged_count > 0 order by flagged_count desc;
-- submits recentes de um IP
select * from submit_log where ip = '1.2.3.4' order by created_at desc limit 50;
```

## What we deliberately do NOT do

- Payload signing/HMAC in the client — stops naive `curl` scripts, but any
  trainer can extract the secret from the JS. Cost without real benefit.
- Client-side anti-cheat (devtools detection, debugger traps) — bypassed in
  minutes by anyone using a trainer. Not worth the maintenance.

## Security roadmap

- **Authoritative multiplayer** (future phase): the server validates kills/damage —
  the only complete fix against trainers.
- Server-signed match sessions (a match only counts if started and ended with
  the server observing).

---

## Technical details

`docs/seguranca.md` documents, for each vulnerability closed in this release:
where it was (`arquivo:linha`), what closes it, how to test it, and what has **not**
been resolved.

## Reporting a vulnerability

**Do not open a public issue.** Email the maintainer at the address on their
GitHub profile (<https://github.com/rubenmarcus>) with: what an attacker can do,
the minimum steps to reproduce it, and the impact you see. Unless a disclosure
timeline has been agreed upon, please do not publish before the fix.

This is a fan project with no bug bounty program — but every valid report will
be included in the credits, if you wish.
