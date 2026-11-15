# ContagionStop — DoraHacks submission draft

**Status: DRAFT — DO NOT SUBMIT yet.**
Submission window: 28 Nov–2 Dec 2026 (safe target). Official deadline:
6 Dec 2026 03:00 WIB. The DoraHacks submit form is likely ONE-SHOT
(answers lock on submit) — submit only with the user's explicit sign-off,
after the demo video is ready.

## About / project description (paste into the DoraHacks "About" field)

ContagionStop is a cross-chain circuit breaker on Reactive Network. When a
protocol's security team pauses one deployment, a watcher on Lasna freezes
every sibling deployment — on Base Sepolia and Unichain Sepolia — within 3
seconds. No keeper, no oracle, no AI: one event, one react(), a fan-out of
pause() callbacks, confirmed per destination. Full loop measured on testnet:
3 seconds, contained after 2. Five scenarios pass, including a retry after a
debt-blocked callback. All contracts Sourcify exact_match.

The trigger is manual by design. ContagionStop does not detect exploits
itself — automatic detection would be a griefing vector: any signal that can
pause a protocol can be faked to freeze it. The owner decides to trip; the
system automates the response, the part humans are slow at. A multisig takes
hours to gather; this takes one block. The trigger is a single on-chain call,
so the owner can hand it to a monitoring contract or keeper later without
changing the system.

Unpause is manual too, by the same logic: reopening needs an audit, not
speed. There is no automatic unpause path, ever.

## Other submission fields

- Track: Every Second Counts
- Repo: https://github.com/0xward/contagion-stop
- Live demo: https://contagion-stop.vercel.app
- Video demo: TODO — YouTube unlisted, under 3 minutes (user records VO;
  script: `demo-video-script.md`)
- Contract addresses + loop transaction hashes: see README.md /
  VERIFICATION.md in the repo (do not retype hashes from memory)

## Pre-submit checklist

- [ ] Demo video recorded, uploaded unlisted, link tested in incognito
- [ ] User reads this About text once and approves it
- [ ] User's DoraHacks account ready (created by user)
- [ ] Submission answers drafted + user sign-off (one-shot form)
- [ ] User clicks submit (not the assistant)
