# ECOVERDICT

**Green claims, tested in public.**

ECOVERDICT is a complete GenLayer application that audits public environmental
claims against live web evidence and issues versioned onchain Green Claim
Passports. It is built for buyers, marketplaces, grant programs, procurement
teams and watchdogs that need more than an unverified sustainability badge.

## The trust problem

Claims such as “carbon neutral,” “100% renewable,” “recyclable,” or “net zero”
often hide decisive scope, time, geography, baseline, offset and methodology
details. A centralized badge issuer creates another trust bottleneck, while a
normal smart contract cannot read changing reports or interpret whether the
evidence supports the exact public wording.

ECOVERDICT freezes the claim and its declared scope, seals 2–6 public HTTPS
sources, and asks independent GenLayer validators to retrieve and assess those
sources. The result is one of:

- `SUBSTANTIATED`
- `QUALIFIED`
- `MISLEADING`
- `INSUFFICIENT_EVIDENCE`

## Live deployment

- App: https://ecoverdict-genlayer.acemidoktor.chatgpt.site
- StudioNet contract: https://explorer-studio.genlayer.com/address/0xF1047C26935a0651162b6BF4691f06f2c2905a21
- Full Consensus audit: https://explorer-studio.genlayer.com/tx/0x3fc34ef90678d4f0a7a735fa0a5bb31c334623573aecee9911940429cb463506

Passport `0` finalized as `SUBSTANTIATED` with score `95`, coverage `90`,
`HIGH` evidence quality, no qualification, zero contradictions and `ACTIVE`
status after validators independently fetched two current official sources.

## Complete lifecycle

1. Register the exact public claim, scope, review standard and review window.
2. Seal an evidence dossier that maps public sources to the claim.
3. Run a Full Consensus audit.
4. Read and reuse the active Green Claim Passport.
5. A different wallet may submit counter-evidence and trigger a new audit.
6. The prior passport becomes `SUPERSEDED` but remains onchain.

## Consensus design

The leader returns structured JSON. Validators independently repeat the web
fetch and analysis. Verdict, evidence quality, material qualification and
contradiction count must match exactly. Support scores must stay in the same
risk band and differ by no more than 10 points; coverage may differ by no more
than 10 points. Deterministic cross-field checks reject contradictory results.

Examples: `SUBSTANTIATED` requires score ≥85, coverage ≥80, non-low evidence,
no qualification and zero contradictions. `MISLEADING` requires score ≤54, a
material unsupported/contradicted finding and at least one contradiction.
Unavailable sources fail closed.

## Security boundaries

- fetched pages, owner notes and challenges are explicitly treated as untrusted;
- prompt instructions found in evidence are never followed;
- only public HTTPS sources are accepted and local/metadata addresses are blocked;
- only the claim owner can assemble the original evidence dossier;
- the owner cannot challenge their own audited claim;
- evidence is sealed after the first audit;
- previous passports are never overwritten or deleted.

## Run locally

```bash
pnpm install
pnpm dev
```

Run contract tests with the GenLayer testing environment:

```bash
pytest -q
```

## Repository map

- `contract.py` — Intelligent Contract and consensus validator
- `app/page.tsx` — complete wallet-to-passport frontend
- `tests/test_ecoverdict.py` — Direct Mode lifecycle and adversarial tests
- `ARCHITECTURE.md` — state machine and trust boundaries
- `TEST_CASES.md` — expected scenarios
- `SUBMISSION.md` — Portal-ready text and evidence checklist

## Scope

ECOVERDICT does not certify environmental performance and is not legal advice.
It produces a transparent consensus assessment of whether submitted live
evidence supports a precisely scoped public claim.
