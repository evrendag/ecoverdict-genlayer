# Test cases

1. Register a detailed claim and seal two valid evidence URLs.
2. Reject evidence changes from a non-owner.
3. Reject local, non-HTTPS and metadata-network URLs.
4. Finalize a consistent `SUBSTANTIATED` passport and expose `is_substantiated`.
5. Finalize a `QUALIFIED` passport when scope is materially limited.
6. Fail closed with `INSUFFICIENT_EVIDENCE` for unavailable sources.
7. Accept counter-evidence only from another wallet and supersede the old
   passport after re-audit.
8. Reject a validator result whose verdict conflicts with the leader.

The test suite mocks web and model output only to make Direct Mode deterministic;
the hosted Full Consensus test must use real URLs and independent validators.

