# npm release 2.3.2 (README sync + stable id fix) - Learnings from 2026-09-03

## What Happened
The npm package page for `vectorvault` still showed the 2.3.1 README, which
described FAISS as the search engine. The engine has been pure TypeScript since
2.2.4 (Jan 25, 2026). The repo README was rewritten on main (52ca441) but npm
only refreshes its README on publish, so a release was required.

While preparing the release, a test run on clean main showed 2 of 30 local
tests failing (test_72_upload_from_json, test_80_duplicate_vault). Root cause
was a real bug, not flaky tests: commit 7f84d19 made `deleteItems` keep ids
stable (no renumbering), so ids can have gaps, but `uploadFromJson` and
`duplicateVault` still assumed ids were `0..count-1`. Import left stale items
behind, and duplicate copied nothing if id 0 had been deleted.

## Root Cause
1. Version drift: npm had 2.3.1 but package.json on main said 2.3.0. Someone ran
   `npm version` / `npm publish` and never committed or pushed the bump. The
   repo could not tell you what was actually live.
2. Stable ids: 7f84d19 changed the id model in `deleteItems` but did not audit
   every caller that iterated by count. Two bulk paths were missed and no test
   covered "delete then import" or "delete then duplicate" with a gap.

## The Fix
- Added `Vault.listItemIds()` (real ids from the mapping, sorted). `uploadFromJson`
  and `duplicateVault` use it instead of `0..count`. `uploadFromJson` resets
  `nextId` to 0 once the vault is empty so imported items start at 0 again.
- Added `tests/stable-ids.test.ts`: 7 no-network tests (mocked embeddings) that
  pin the stable id model, including gaps surviving reload. Verified they fail
  on the old code (5 of 7) and pass on the fix.
- Bumped package.json and package-lock.json to 2.3.2 with
  `npm version 2.3.2 --no-git-tag-version`, committed the bump, pushed main.
  The publish itself was blocked on npm auth (`npm whoami` returned E401 for
  the full 45 minute wait window), so 2.3.2 is READY-TO-PUBLISH from 98214fe:
  `npm publish --access public`, then `git tag v2.3.2 && git push origin v2.3.2`.
- Publish gate: `npm pack` to a temp dir, listed the tarball (7 files: dist/ x4,
  README.md, LICENSE, package.json), grepped for secret shapes, checked the
  packed README headline, and smoke-imported the tarball in a fresh project
  (ESM and CJS) before `npm publish`.

## Prevention
- Never publish from an uncommitted version bump. Order is: bump, commit, push,
  publish, tag. If `npm view vectorvault version` != package.json on main, fix
  the repo first.
- When a data model changes (ids, mapping, storage layout), grep for every
  consumer of `getTotalItems()` and any `for (let i = 0; i < count` loop over
  ids. Ids are a set, not a range.
- Run `npm run test:local` before any release; it needs only OPENAI_API_KEY.
  `tests/stable-ids.test.ts` needs no key at all and should always be green.
- Known pre-existing failures unrelated to this release: `tests/anthropic.test.ts`
  (model id `claude-3-5-haiku-latest` rejected by the API) and
  `tests/gemini.test.ts` (`text-embedding-004` gone from v1beta). Both are stale
  model ids in tests, not library bugs, and they fail identically on 52ca441.
  Update the test model ids in a follow-up.
- npm auth on this machine expires; check `npm whoami` first and let John run
  `npm login` himself. Do not edit ~/.npmrc from an agent.
