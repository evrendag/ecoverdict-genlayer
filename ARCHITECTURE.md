# Architecture

## State machine

`DRAFT → EVIDENCE_READY → CERTIFIED | QUALIFIED | DISPUTED | UNVERIFIED`

An audited claim may receive one active third-party challenge:

`audited state → CHALLENGED → new audit → new audited state`

The new audit creates a new passport version. The prior active passport becomes
`SUPERSEDED`; its contents remain immutable.

## Onchain records

`GreenClaim` stores owner, subject, exact wording, declared scope, audit
standard, review window, sealed sources, evidence map, challenge data, status,
audit count and latest passport ID.

`GreenPassport` stores claim ID, version, verdict, score, coverage, evidence
quality, material qualification, contradiction count, rationale, review window
and active/superseded status.

## Consensus transaction

Each validator independently:

1. fetches every sealed evidence and counter-evidence URL;
2. places bounded page text inside explicit untrusted-data delimiters;
3. checks exact wording, period, boundary, geography, baseline and methodology;
4. distinguishes matching from 24/7 supply, reductions from offsets, and
   recyclability from actual collection/recycling;
5. returns a structured assessment;
6. validates deterministic cross-field invariants;
7. compares its result with the leader under the declared equivalence rule.

## Equivalence rule

- exact: verdict, evidence quality, qualification, contradiction count;
- bounded: score same band and within 10 points;
- bounded: coverage within 10 points;
- rationale may differ because it is explanatory rather than state-critical.

## Read integration

External applications can call `get_claim`, `get_passport`, `get_counts` and
`is_substantiated`. The final method only returns true for the active latest
passport whose verdict is `SUBSTANTIATED`.

