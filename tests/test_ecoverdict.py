import json


SUBJECT = "ExampleCo renewable electricity claim"
CLAIM = "ExampleCo matched 100% of its annual operational electricity use with renewable electricity in 2025."
SCOPE = "Annual market-based matching for owned operations; this does not claim hourly carbon-free operation."
STANDARD = "Require direct support for period, boundary, metric and methodology from current authoritative sources."
SOURCES = json.dumps([
    "https://example.org/sustainability-report",
    "https://authority.example/renewable-register",
])
NOTE = "The report states the metric and the independent registry confirms the matching certificates."
SUBSTANTIATED = json.dumps({
    "verdict": "SUBSTANTIATED", "score": 93, "coverage": 92,
    "evidence_quality": "HIGH", "qualification": "NONE",
    "contradiction_count": 0,
    "rationale": "The reporting period, operational boundary and annual matching method are directly supported by both sources."
})
QUALIFIED = json.dumps({
    "verdict": "QUALIFIED", "score": 72, "coverage": 76,
    "evidence_quality": "HIGH", "qualification": "SCOPE_LIMITED",
    "contradiction_count": 0,
    "rationale": "The annual matching statement is supported, but the evidence covers owned operations rather than the full value chain."
})
MISLEADING = json.dumps({
    "verdict": "MISLEADING", "score": 31, "coverage": 38,
    "evidence_quality": "HIGH", "qualification": "CONTRADICTED",
    "contradiction_count": 1,
    "rationale": "The evidence documents annual certificate matching and contradicts the broader claim of hourly carbon-free operation."
})
INSUFFICIENT = json.dumps({
    "verdict": "INSUFFICIENT_EVIDENCE", "score": 25, "coverage": 20,
    "evidence_quality": "LOW", "qualification": "BROKEN_SOURCE",
    "contradiction_count": 0,
    "rationale": "The submitted pages are unavailable, so the claim cannot be assessed safely against current evidence."
})


def deploy(direct_deploy):
    return direct_deploy("contract.py", sdk_version="v0.2.12")


def mock_sources(direct_vm):
    direct_vm.mock_web(r".*example\.org.*", {
        "status": 200,
        "body": "2025 report: ExampleCo matched 100% of electricity used in owned operations annually with renewable energy certificates."
    })
    direct_vm.mock_web(r".*authority\.example.*", {
        "status": 200,
        "body": "Registry record confirms retirement of certificates equal to ExampleCo owned-operations electricity consumption in 2025."
    })


def register_and_evidence(contract):
    contract.register_claim(SUBJECT, CLAIM, SCOPE, STANDARD, 90)
    contract.set_evidence(0, SOURCES, NOTE)


def test_register_and_attach_evidence(direct_deploy):
    contract = deploy(direct_deploy)
    register_and_evidence(contract)
    assert contract.get_claim(0).status == "EVIDENCE_READY"
    assert list(contract.get_counts()) == [1, 0]


def test_only_owner_can_change_evidence(direct_vm, direct_deploy, direct_bob):
    contract = deploy(direct_deploy)
    contract.register_claim(SUBJECT, CLAIM, SCOPE, STANDARD, 90)
    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert("Only the claim owner"):
            contract.set_evidence(0, SOURCES, NOTE)


def test_rejects_unsafe_source(direct_vm, direct_deploy):
    contract = deploy(direct_deploy)
    contract.register_claim(SUBJECT, CLAIM, SCOPE, STANDARD, 90)
    bad = json.dumps(["https://example.org/report", "http://127.0.0.1/private"])
    with direct_vm.expect_revert("safe public HTTPS"):
        contract.set_evidence(0, bad, NOTE)


def test_substantiated_passport(direct_vm, direct_deploy):
    mock_sources(direct_vm)
    direct_vm.mock_llm(r".*", SUBSTANTIATED)
    contract = deploy(direct_deploy)
    register_and_evidence(contract)
    contract.audit_claim(0)
    passport = contract.get_passport(0)
    assert passport.status == "ACTIVE"
    assert passport.verdict == "SUBSTANTIATED"
    assert contract.get_claim(0).status == "CERTIFIED"
    assert contract.is_substantiated(0) is True
    assert direct_vm.run_validator() is True


def test_qualified_claim(direct_vm, direct_deploy):
    mock_sources(direct_vm)
    direct_vm.mock_llm(r".*", QUALIFIED)
    contract = deploy(direct_deploy)
    register_and_evidence(contract)
    contract.audit_claim(0)
    assert contract.get_passport(0).qualification == "SCOPE_LIMITED"
    assert contract.get_claim(0).status == "QUALIFIED"


def test_insufficient_evidence_fails_closed(direct_vm, direct_deploy):
    mock_sources(direct_vm)
    direct_vm.mock_llm(r".*", INSUFFICIENT)
    contract = deploy(direct_deploy)
    register_and_evidence(contract)
    contract.audit_claim(0)
    assert contract.get_claim(0).status == "UNVERIFIED"
    assert contract.is_substantiated(0) is False


def test_challenge_supersedes_previous_passport(direct_vm, direct_deploy, direct_bob):
    mock_sources(direct_vm)
    direct_vm.mock_llm(r".*", SUBSTANTIATED)
    contract = deploy(direct_deploy)
    register_and_evidence(contract)
    contract.audit_claim(0)
    with direct_vm.prank(direct_bob):
        contract.open_challenge(0, "The claim confuses annual matching with hourly carbon-free operation.", json.dumps(["https://authority.example/hourly-guidance"]))
    direct_vm.clear_mocks()
    mock_sources(direct_vm)
    direct_vm.mock_web(r".*hourly-guidance.*", {"status": 200, "body": "Annual matching does not establish hourly carbon-free operation."})
    direct_vm.mock_llm(r".*", MISLEADING)
    contract.audit_claim(0)
    assert contract.get_passport(0).status == "SUPERSEDED"
    assert contract.get_passport(1).verdict == "MISLEADING"
    assert contract.get_claim(0).status == "DISPUTED"


def test_validator_rejects_conflicting_verdict(direct_vm, direct_deploy):
    mock_sources(direct_vm)
    direct_vm.mock_llm(r".*", SUBSTANTIATED)
    contract = deploy(direct_deploy)
    register_and_evidence(contract)
    contract.audit_claim(0)
    direct_vm.clear_mocks()
    mock_sources(direct_vm)
    direct_vm.mock_llm(r".*", QUALIFIED)
    assert direct_vm.run_validator() is False
