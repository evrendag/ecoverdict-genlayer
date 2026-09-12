"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import { ArrowUpRight, BadgeCheck, CircleAlert, FileSearch, FlaskConical, Leaf, Link2, Loader2, Plus, RefreshCw, Scale, ShieldAlert, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

declare global {
  interface Window { ethereum?: { request(args: { method: string; params?: unknown[] }): Promise<unknown> }; }
  interface Document { modelContext?: { registerTool(tool: Record<string, unknown>, options?: { signal?: AbortSignal }): void | Promise<void> }; }
}

type Claim = {
  owner?: string; subject?: string; claim_text?: string; scope?: string;
  review_standard?: string; validity_days?: number | bigint; sources_json?: string;
  evidence_note?: string; challenge_text?: string; status?: string;
  audit_count?: number | bigint; latest_passport_id?: number | bigint;
};
type Passport = {
  claim_id?: number | bigint; version?: number | bigint; verdict?: string;
  score?: number | bigint; coverage?: number | bigint; evidence_quality?: string;
  qualification?: string; contradiction_count?: number | bigint;
  rationale?: string; validity_days?: number | bigint; status?: string;
};

const DEFAULT_CONTRACT = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "0xF1047C26935a0651162b6BF4691f06f2c2905a21";
const readClient = createClient({ chain: studionet });
const DEMO_SUBJECT = "Google clean energy claim";
const DEMO_CLAIM = "Google pays for 100% of the electricity used by its data centers and offices, while 24/7 carbon-free energy on every grid remains a future ambition rather than a current achievement.";
const DEMO_SCOPE = "Global Google data centers and offices; distinguishes annual procurement and payment from hourly location-matched carbon-free operation.";
const DEMO_STANDARD = "Verify the current wording, operational boundary, procurement method, reporting period and distinction between present annual matching and the 24/7 ambition using live official sources.";
const DEMO_NOTE = "Google's current official sustainability and data-center pages describe clean-energy procurement, the present electricity-payment boundary, and the separate future 24/7 carbon-free energy ambition.";
const DEMO_SOURCES = [
  "https://sustainability.google/operations/",
  "https://datacenters.google/operating-sustainably/",
];
const shortAddress = (value: string) => value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "Not connected";

export default function Home() {
  const [contractAddress, setContractAddress] = useState(DEFAULT_CONTRACT);
  const [account, setAccount] = useState("");
  const [subject, setSubject] = useState(DEMO_SUBJECT);
  const [claimText, setClaimText] = useState(DEMO_CLAIM);
  const [scope, setScope] = useState(DEMO_SCOPE);
  const [reviewStandard, setReviewStandard] = useState(DEMO_STANDARD);
  const [validityDays, setValidityDays] = useState("90");
  const [claimId, setClaimId] = useState("0");
  const [passportId, setPassportId] = useState("0");
  const [sources, setSources] = useState(DEMO_SOURCES);
  const [evidenceNote, setEvidenceNote] = useState(DEMO_NOTE);
  const [challengeText, setChallengeText] = useState("The wording should be re-audited against evidence that distinguishes annual matching from hourly carbon-free operation.");
  const [challengeSources, setChallengeSources] = useState(["https://www.google.com/about/datacenters/cleanenergy/"]);
  const [claim, setClaim] = useState<Claim | null>(null);
  const [passport, setPassport] = useState<Passport | null>(null);
  const [tab, setTab] = useState("claim");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("Ready to register a public environmental claim.");
  const [txHash, setTxHash] = useState("");

  const validContract = /^0x[a-fA-F0-9]{40}$/.test(contractAddress) && !/^0x0{40}$/.test(contractAddress);
  const cleanSources = useMemo(() => sources.map((v) => v.trim()).filter(Boolean), [sources]);
  const cleanChallengeSources = useMemo(() => challengeSources.map((v) => v.trim()).filter(Boolean), [challengeSources]);

  const walletClient = useCallback(() => {
    if (!account || !window.ethereum) throw new Error("Connect a wallet first.");
    return createClient({ chain: studionet, account: account as `0x${string}`, provider: window.ethereum as never });
  }, [account]);

  async function connectWallet() {
    if (!window.ethereum) throw new Error("Install MetaMask to sign GenLayer transactions.");
    setBusy("connect");
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
      const address = accounts[0];
      if (!address) throw new Error("No wallet account was returned.");
      const client = createClient({ chain: studionet, account: address as `0x${string}`, provider: window.ethereum as never });
      await client.connect("studionet");
      setAccount(address);
      setMessage("Wallet connected to GenLayer StudioNet.");
    } finally { setBusy(null); }
  }

  async function wait(hash: `0x${string}`) {
    setTxHash(hash);
    await readClient.waitForTransactionReceipt({ hash, status: TransactionStatus.FINALIZED });
  }

  async function registerClaim() {
    if (!validContract) throw new Error("Enter a deployed ECOVERDICT contract address.");
    if (subject.trim().length < 3 || claimText.trim().length < 30 || scope.trim().length < 20 || reviewStandard.trim().length < 30) throw new Error("Complete the claim, scope and review standard.");
    const days = Number(validityDays);
    if (days < 7 || days > 365) throw new Error("Validity must be between 7 and 365 days.");
    setBusy("register");
    try {
      const counts = await readClient.readContract({ address: contractAddress as `0x${string}`, functionName: "get_counts", args: [] }) as (number | bigint)[];
      const id = Number(counts[0]);
      const hash = await walletClient().writeContract({ address: contractAddress as `0x${string}`, functionName: "register_claim", args: [subject.trim(), claimText.trim(), scope.trim(), reviewStandard.trim(), days], value: 0n });
      setMessage("Claim registration submitted. Waiting for finalization…");
      await wait(hash); setClaimId(String(id)); setTab("evidence"); await loadClaim(String(id));
      setMessage(`Claim #${id} is registered. Attach its evidence dossier.`);
    } finally { setBusy(null); }
  }

  async function attachEvidence() {
    if (!validContract || cleanSources.length < 2) throw new Error("Add at least two public HTTPS sources.");
    if (evidenceNote.trim().length < 20) throw new Error("Explain what the evidence is expected to prove.");
    setBusy("evidence");
    try {
      const hash = await walletClient().writeContract({ address: contractAddress as `0x${string}`, functionName: "set_evidence", args: [Number(claimId), JSON.stringify(cleanSources), evidenceNote.trim()], value: 0n });
      setMessage("Evidence dossier submitted. Waiting for finalization…");
      await wait(hash); await loadClaim(claimId); setTab("audit");
      setMessage(`Evidence for claim #${claimId} is sealed and ready for audit.`);
    } finally { setBusy(null); }
  }

  async function auditClaim() {
    if (!validContract) throw new Error("Enter a deployed ECOVERDICT contract address.");
    setBusy("audit");
    try {
      const counts = await readClient.readContract({ address: contractAddress as `0x${string}`, functionName: "get_counts", args: [] }) as (number | bigint)[];
      const id = Number(counts[1]);
      const hash = await walletClient().writeContract({ address: contractAddress as `0x${string}`, functionName: "audit_claim", args: [Number(claimId)], value: 0n });
      setMessage("Validators are fetching every source and comparing the exact wording…");
      await wait(hash); setPassportId(String(id)); await loadPassport(String(id)); await loadClaim(claimId); setTab("passport");
      setMessage("Full Consensus finalized. The Green Claim Passport is onchain.");
    } finally { setBusy(null); }
  }

  async function openChallenge() {
    if (challengeText.trim().length < 30 || cleanChallengeSources.length < 1) throw new Error("Add a detailed challenge and at least one HTTPS source.");
    setBusy("challenge");
    try {
      const hash = await walletClient().writeContract({ address: contractAddress as `0x${string}`, functionName: "open_challenge", args: [Number(claimId), challengeText.trim(), JSON.stringify(cleanChallengeSources)], value: 0n });
      setMessage("Challenge submitted. Waiting for finalization…");
      await wait(hash); await loadClaim(claimId); setTab("audit");
      setMessage("Challenge accepted. Run a new audit to supersede the current passport.");
    } finally { setBusy(null); }
  }

  const loadClaim = useCallback(async (target = claimId) => {
    if (!validContract) throw new Error("Enter a deployed contract address.");
    const value = await readClient.readContract({ address: contractAddress as `0x${string}`, functionName: "get_claim", args: [Number(target)] }) as Claim;
    setClaim(value); setClaimId(String(target)); return value;
  }, [claimId, contractAddress, validContract]);

  const loadPassport = useCallback(async (target = passportId) => {
    if (!validContract) throw new Error("Enter a deployed contract address.");
    setBusy("load");
    try {
      const value = await readClient.readContract({ address: contractAddress as `0x${string}`, functionName: "get_passport", args: [Number(target)] }) as Passport;
      setPassport(value); setPassportId(String(target));
      if (value?.claim_id !== undefined) { setClaimId(String(Number(value.claim_id))); await loadClaim(String(Number(value.claim_id))); }
      setMessage(value?.status === "NOT_FOUND" ? "Passport not found." : "Onchain passport loaded."); return value;
    } finally { setBusy(null); }
  }, [passportId, contractAddress, loadClaim, validContract]);

  function guarded(action: () => Promise<unknown>) { void action().catch((error) => { setBusy(null); setMessage(error instanceof Error ? error.message : "The operation failed."); }); }

  useEffect(() => {
    const context = document.modelContext; if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({ name: "stage_ecoverdict_demo", title: "Stage ECOVERDICT demo", description: "Populate the claim and evidence fields with the renewable-electricity matching example without sending a transaction.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute() { setSubject(DEMO_SUBJECT); setClaimText(DEMO_CLAIM); setScope(DEMO_SCOPE); setReviewStandard(DEMO_STANDARD); setSources(DEMO_SOURCES); setEvidenceNote(DEMO_NOTE); setTab("claim"); return { staged: true, sources: 2, validity_days: 90 }; } }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  const verdict = passport?.verdict ?? "UNAUDITED";
  const tone = verdict === "SUBSTANTIATED" ? "verified" : verdict === "MISLEADING" ? "rejected" : verdict === "QUALIFIED" ? "review" : "neutral";

  return (
    <main className="min-h-screen bg-[#090a07] text-[#f3f4e9]">
      <header className="border-b border-[#dfff64]/15 bg-[#090a07]/95">
        <div className="mx-auto flex max-w-[1540px] items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-full border border-[#dfff64]/40 bg-[#dfff64] text-[#111407]"><Leaf size={21}/></div><div><p className="font-semibold tracking-[.08em]">ECOVERDICT</p><p className="text-xs text-[#979b80]">Green claims, tested in public</p></div></div>
          <Button onClick={() => guarded(connectWallet)} disabled={!!busy} className="rounded-full bg-[#f3f4e9] text-[#111407] hover:bg-[#dfff64]"><Wallet size={16}/>{account ? shortAddress(account) : "Connect wallet"}</Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1540px] gap-6 px-5 py-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(390px,.7fr)] lg:px-8 lg:py-8">
        <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[#11130d] shadow-2xl shadow-black/30">
          <div className="grid gap-6 border-b border-white/10 px-6 py-6 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div><div className="mb-2 flex items-center gap-2 text-sm text-[#dfff64]"><FlaskConical size={16}/> Live environmental-claim audit</div><h1 className="max-w-3xl text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">A green claim should carry its evidence.</h1><p className="mt-3 max-w-3xl text-base leading-7 text-[#a6aa91]">Freeze the exact wording and scope, attach public sources, then let independent GenLayer validators issue a challengeable onchain passport.</p></div>
            <div className="rounded-2xl border border-[#dfff64]/20 bg-[#dfff64]/5 px-4 py-3 text-sm"><p className="text-[#7f846d]">Current claim</p><p className="mt-1 font-mono text-[#dfff64]">#{claimId} · {claim?.status ?? "DRAFT"}</p></div>
          </div>

          <div className="px-6 pt-6 sm:px-8"><label htmlFor="contract" className="mb-2 block text-sm font-medium">Deployed ECOVERDICT contract</label><Input id="contract" value={contractAddress} onChange={(e) => setContractAddress(e.target.value.trim())} placeholder="0x…" className="h-12 border-white/10 bg-[#090a07] font-mono text-sm"/></div>

          <Tabs value={tab} onValueChange={setTab} className="p-6 sm:p-8">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-[#090a07] p-1 sm:grid-cols-4"><TabsTrigger value="claim" className="h-11">1 · Claim</TabsTrigger><TabsTrigger value="evidence" className="h-11">2 · Evidence</TabsTrigger><TabsTrigger value="audit" className="h-11">3 · Audit</TabsTrigger><TabsTrigger value="passport" className="h-11">4 · Passport</TabsTrigger></TabsList>

            <TabsContent value="claim" className="mt-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-[1fr_150px]"><Field label="Claim subject"><Input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-11 border-white/10 bg-[#090a07]"/></Field><Field label="Review window"><div className="relative"><Input inputMode="numeric" value={validityDays} onChange={(e) => setValidityDays(e.target.value.replace(/\D/g, ""))} className="h-11 border-white/10 bg-[#090a07] pr-14"/><span className="absolute right-3 top-3 text-sm text-[#777c65]">days</span></div></Field></div>
              <Field label="Exact public claim"><Textarea value={claimText} onChange={(e) => setClaimText(e.target.value)} rows={4} className="resize-none border-white/10 bg-[#090a07] text-base leading-7"/></Field>
              <Field label="Declared scope and exclusions"><Textarea value={scope} onChange={(e) => setScope(e.target.value)} rows={3} className="resize-none border-white/10 bg-[#090a07] leading-7"/></Field>
              <Field label="Audit standard"><Textarea value={reviewStandard} onChange={(e) => setReviewStandard(e.target.value)} rows={3} className="resize-none border-white/10 bg-[#090a07] leading-7"/></Field>
              <Button onClick={() => guarded(registerClaim)} disabled={!!busy || !account} className="h-12 w-full bg-[#dfff64] font-semibold text-[#111407] hover:bg-[#edff9f]">{busy === "register" ? <Loader2 className="animate-spin"/> : <BadgeCheck/>}Register exact claim</Button>
            </TabsContent>

            <TabsContent value="evidence" className="mt-6 space-y-5">
              <Field label="Claim ID"><Input inputMode="numeric" value={claimId} onChange={(e) => setClaimId(e.target.value.replace(/\D/g, ""))} className="h-11 max-w-40 border-white/10 bg-[#090a07]"/></Field>
              <Field label="Public evidence URLs">{sources.map((source, index) => <div key={index} className="mb-2 flex gap-2"><div className="relative flex-1"><Link2 className="absolute left-3 top-3.5 text-[#777c65]" size={17}/><Input aria-label={`Evidence source ${index + 1}`} value={source} onChange={(e) => setSources((old) => old.map((v, i) => i === index ? e.target.value : v))} placeholder="https://…" className="h-11 border-white/10 bg-[#090a07] pl-10"/></div>{sources.length > 2 && <Button variant="ghost" size="icon" aria-label="Remove source" onClick={() => setSources((old) => old.filter((_, i) => i !== index))}><X size={16}/></Button>}</div>)}{sources.length < 6 && <Button variant="outline" onClick={() => setSources((old) => [...old, ""])} className="border-dashed border-white/15 bg-transparent"><Plus size={16}/>Add source</Button>}</Field>
              <Field label="Evidence map"><Textarea value={evidenceNote} onChange={(e) => setEvidenceNote(e.target.value)} rows={4} className="resize-none border-white/10 bg-[#090a07] leading-7"/></Field>
              <Button onClick={() => guarded(attachEvidence)} disabled={!!busy || !account} className="h-12 w-full bg-[#dfff64] font-semibold text-[#111407] hover:bg-[#edff9f]">{busy === "evidence" ? <Loader2 className="animate-spin"/> : <FileSearch/>}Seal evidence dossier</Button>
            </TabsContent>

            <TabsContent value="audit" className="mt-6 space-y-5">
              <div className="rounded-[24px] border border-[#dfff64]/20 bg-[#dfff64]/5 p-5"><div className="flex items-start gap-3"><Scale className="mt-0.5 text-[#dfff64]"/><div><h3 className="font-semibold">Independent evidence audit</h3><p className="mt-2 leading-7 text-[#a6aa91]">Each validator fetches the sealed URLs itself, tests the exact wording, scope, period, geography and methodology, and returns the same structured verdict class. Weak evidence fails closed.</p></div></div></div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Mini label="Verdicts" value="4"/><Mini label="Score tolerance" value="±10"/><Mini label="Source limit" value="6"/><Mini label="Re-auditable" value="Yes"/></div>
              <Button onClick={() => guarded(auditClaim)} disabled={!!busy || !account} className="h-12 w-full bg-[#dfff64] font-semibold text-[#111407] hover:bg-[#edff9f]">{busy === "audit" ? <Loader2 className="animate-spin"/> : <Scale/>}Run Full Consensus audit</Button>
            </TabsContent>

            <TabsContent value="passport" className="mt-6 space-y-5">
              <div className="flex gap-2"><Input aria-label="Passport ID" inputMode="numeric" value={passportId} onChange={(e) => setPassportId(e.target.value.replace(/\D/g, ""))} className="h-11 border-white/10 bg-[#090a07]"/><Button variant="outline" onClick={() => guarded(() => loadPassport())} disabled={!!busy || !validContract} className="h-11 border-white/15 bg-transparent"><RefreshCw size={16}/>Load</Button></div>
              <div className="rounded-[24px] border border-white/10 bg-[#090a07] p-5"><div className="mb-3 flex items-center gap-2 text-sm text-[#ffbf69]"><ShieldAlert size={16}/> Independent challenge path</div><p className="mb-4 text-sm leading-6 text-[#91967e]">A different wallet can submit counter-evidence. The next consensus audit supersedes, but never deletes, the historical passport.</p><Textarea value={challengeText} onChange={(e) => setChallengeText(e.target.value)} rows={3} className="resize-none border-white/10 bg-[#11130d] leading-6"/><Input value={challengeSources[0] ?? ""} onChange={(e) => setChallengeSources([e.target.value])} placeholder="https://counter-evidence…" className="mt-3 h-11 border-white/10 bg-[#11130d]"/><Button variant="outline" onClick={() => guarded(openChallenge)} disabled={!!busy || !account} className="mt-3 w-full border-[#ffbf69]/30 bg-transparent text-[#ffcf8a] hover:bg-[#ffbf69]/10">Open evidence challenge</Button></div>
            </TabsContent>
          </Tabs>
        </section>

        <aside className="space-y-6">
          <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[#13150e]"><div className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(223,255,100,.12),transparent)] p-6 sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-sm text-[#9da286]">Green Claim Passport</p><h2 className="mt-1 text-3xl font-semibold">#{passportId}</h2></div><Badge className={`status-${tone}`}>{verdict.replaceAll("_", " ")}</Badge></div></div>{passport ? <div className="space-y-5 p-6 sm:p-7"><div className="grid grid-cols-2 gap-3"><Metric label="Claim" value={`#${Number(passport.claim_id ?? 0)}`}/><Metric label="Version" value={`v${Number(passport.version ?? 0)}`}/><Metric label="Support score" value={`${Number(passport.score ?? 0)} / 100`}/><Metric label="Claim coverage" value={`${Number(passport.coverage ?? 0)}%`}/><Metric label="Evidence" value={passport.evidence_quality || "—"}/><Metric label="Qualification" value={(passport.qualification || "—").replaceAll("_", " ")}/><Metric label="Contradictions" value={String(Number(passport.contradiction_count ?? 0))}/><Metric label="Review window" value={`${Number(passport.validity_days ?? 0)} days`}/></div><div className="rounded-2xl border border-white/10 bg-[#090a07] p-4"><p className="text-xs uppercase tracking-[.13em] text-[#777c65]">Consensus rationale</p><p className="mt-2 leading-7 text-[#e7e9db]">{passport.rationale || "This passport has not been audited yet."}</p></div><div className="flex items-center gap-2 text-sm text-[#9da286]"><BadgeCheck size={16} className={passport.status === "ACTIVE" ? "text-[#dfff64]" : ""}/>Immutable version · {passport.status}</div></div> : <div className="px-6 py-12 text-center"><CircleAlert className="mx-auto text-[#6f745f]"/><p className="mt-3 text-sm leading-6 text-[#979b80]">Complete the audit or load an existing passport.</p></div>}</section>

          <section className="rounded-[24px] border border-white/10 bg-[#11130d] p-6"><p className="text-xs uppercase tracking-[.14em] text-[#777c65]">Protocol status</p><p aria-live="polite" className="mt-2 leading-6 text-[#e4e6d8]">{message}</p>{txHash && <a className="mt-4 inline-flex items-center gap-1.5 text-sm text-[#dfff64] hover:underline" href={`https://explorer-studio.genlayer.com/tx/${txHash}`} target="_blank" rel="noreferrer">Open transaction <ArrowUpRight size={14}/></a>}</section>
          <section className="grid grid-cols-4 gap-2 rounded-[24px] border border-white/10 bg-[#11130d] p-4 text-center"><Step done={!!claim} label="Claim"/><Step done={claim?.status !== "DRAFT" && !!claim} label="Evidence"/><Step done={!!passport} label="Audit"/><Step done={passport?.status === "ACTIVE"} label="Passport"/></section>
        </aside>
      </div>

      <footer className="mx-auto flex max-w-[1540px] flex-wrap items-center justify-between gap-3 px-5 pb-8 text-sm text-[#777c65] lg:px-8"><p>Evidence can change. A trustworthy claim must be re-auditable.</p><div className="flex gap-4">{validContract && <a className="hover:text-[#dfff64]" href={`https://explorer-studio.genlayer.com/address/${contractAddress}`} target="_blank" rel="noreferrer">Contract</a>}<a className="hover:text-[#dfff64]" href="https://github.com/evrendag/ecoverdict-genlayer" target="_blank" rel="noreferrer">Source</a></div></footer>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div><label className="mb-2 block text-sm font-medium">{label}</label>{children}</div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-white/10 bg-[#090a07] p-4"><p className="text-xs text-[#777c65]">{label}</p><p className="mt-1 break-words text-sm font-semibold text-[#eef0e2]">{value}</p></div>; }
function Mini({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-white/10 bg-[#090a07] p-3 text-center"><p className="text-lg font-semibold text-[#dfff64]">{value}</p><p className="mt-1 text-xs text-[#777c65]">{label}</p></div>; }
function Step({ label, done }: { label: string; done?: boolean }) { return <div className={done ? "text-[#dfff64]" : "text-[#646954]"}><div className={`mx-auto mb-2 h-1.5 rounded-full ${done ? "bg-[#dfff64]" : "bg-white/10"}`}/><span className="text-xs">{label}</span></div>; }
