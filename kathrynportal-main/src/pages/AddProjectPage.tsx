import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronRight, Plus, X, Info } from "lucide-react";
import { useState } from "react";
import { useAppStore } from "@/store/appStore";
import { conditionalFormattingRules, type ProjectStage, type ProjectType, type DocumentRule } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import PageHeader from "@/components/shared/PageHeader";
import { toast } from "sonner";

type TxType = "Listing" | "Buyer File";
type LoanType = "Conventional" | "FHA/VA" | "All Cash" | "Other";
type YesNo = "yes" | "no" | "";

interface AgentParty {
  name: string; email: string; phone: string;
  licenseNumber: string; brokerage: string; brokerageLicense: string;
  notes: string;
}
interface SimpleParty { name: string; email: string; }
interface EscrowParty {
  name: string; email: string; phone: string; company: string;
  address: string; cityStateZip: string;
}
interface PersonParty {
  name: string; email: string; salutation: string;
  entityType: string; entityName: string; title: string;
}

const blankAgent = (): AgentParty => ({
  name: "", email: "", phone: "", licenseNumber: "",
  brokerage: "", brokerageLicense: "", notes: "",
});
const blankSimple = (): SimpleParty => ({ name: "", email: "" });
const blankEscrow = (): EscrowParty => ({
  name: "", email: "", phone: "", company: "", address: "", cityStateZip: "",
});
const blankPerson = (): PersonParty => ({
  name: "", email: "", salutation: "", entityType: "", entityName: "", title: "",
});

export default function AddProjectPage() {
  const navigate = useNavigate();
  const clients = useAppStore((s) => s.clients);
  const addProject = useAppStore((s) => s.addProject);

  // Sections collapse state
  const [open, setOpen] = useState({
    general: true, timeline: true, parties: true,
    listing: true, transaction: true, property: true,
  });
  const toggle = (k: keyof typeof open) => setOpen(p => ({ ...p, [k]: !p[k] }));

  // Top-level
  const [type, setType] = useState<TxType>("Listing");
  const [clientId, setClientId] = useState("");

  // General
  const [nextStep, setNextStep] = useState("");
  const [nextStepDate, setNextStepDate] = useState("");

  // Timeline
  const [timeline, setTimeline] = useState({
    contractDate: "", acceptanceDate: "", preapproval: "",
    verificationOfFunds: "", emdToEscrow: "", sellerDisclosuresToBuyer: "",
    investigationContingency: "", insuranceContingency: "",
    reviewSellerDocs: "", reviewPrelim: "", reviewCommIntDiscl: "",
    appraisalContingency: "", loanContingency: "",
    verificationOfPropertyCondition: "Within 5 days prior to COE",
    estimatedCOE: "", possession: "Upon notice of recordation",
  });
  const [showCOP, setShowCOP] = useState(false);
  const [cop, setCop] = useState({ intoContract: "", coe: "" });
  const [showSPRP, setShowSPRP] = useState(false);
  const [sprp, setSprp] = useState({ intoContract: "", coe: "" });

  // Parties
  const [buyerAgents, setBuyerAgents] = useState<AgentParty[]>([blankAgent()]);
  const [additionalBuyerAgent, setAdditionalBuyerAgent] = useState(false);
  const [buyerAgent3, setBuyerAgent3] = useState<AgentParty>(blankAgent());
  const [buyerAgentTC, setBuyerAgentTC] = useState<SimpleParty>(blankSimple());
  const [buyerAgentAssistant, setBuyerAgentAssistant] = useState<SimpleParty>(blankSimple());
  const [listingAgents, setListingAgents] = useState<AgentParty[]>([blankAgent()]);
  const [additionalListingAgent, setAdditionalListingAgent] = useState(false);
  const [listingAgent3, setListingAgent3] = useState<AgentParty>(blankAgent());
  const [listingAgentTC, setListingAgentTC] = useState<SimpleParty>(blankSimple());
  const [escrow, setEscrow] = useState<EscrowParty>(blankEscrow());
  const [escrowAssistant, setEscrowAssistant] = useState<SimpleParty>(blankSimple());
  const [lender, setLender] = useState({ name: "", company: "" });
  const [sellers, setSellers] = useState<PersonParty[]>([blankPerson()]);
  const [buyers, setBuyers] = useState<PersonParty[]>([blankPerson()]);

  // Listing Details (Listing only)
  const [listing, setListing] = useState({
    targetOMD: "", disclosureTiming: "",
    questionnairesElectronically: "" as YesNo,
    docuSign: "" as YesNo,
    nhdCompany: "", nhdEnvironmental: false,
  });

  // Transaction Details
  const [transaction, setTransaction] = useState({
    purchasePrice: "",
    docuSign: "" as YesNo,
    loanType: "Conventional" as LoanType,
    spbbPct: "",
    ftc: "" as YesNo,
    ftcAmount: "", ftcPaidBy: "",
    nhdRpa: "", homeWarranty: "", escrowNumber: "", notes: "",
  });

  // Property Information
  const [property, setProperty] = useState({
    mlsNumber: "",
    propertyType: "SFR",
    address: "", city: "", state: "CA", zip: "",
    county: "", yearBuilt: "", lotSize: "", squareFeet: "",
    disclosureLink: "",
    exemptSeller: "" as YesNo,
    solar: "" as YesNo, well: "" as YesNo, septic: "" as YesNo,
    hoa: "" as YesNo, hoaOrderDetails: "",
    tenantOccupied: "" as YesNo,
  });

  const isAllCash = transaction.loanType === "All Cash";
  const noHOA = property.hoa === "no";
  const isListing = type === "Listing";

  // Auto-fill from client
  const onClientChange = (v: string) => {
    setClientId(v);
    const c = clients.find(x => x.id === v);
    if (c?.propertyAddress) {
      setProperty(prev => ({
        ...prev,
        address: prev.address || c.propertyAddress,
        city: prev.city || c.city,
        state: prev.state || c.state,
        zip: prev.zip || c.zip,
      }));
    }
  };

  const addBuyer = () => buyers.length < 4 && setBuyers(prev => [...prev, blankPerson()]);
  const removeBuyer = (i: number) => setBuyers(prev => prev.filter((_, idx) => idx !== i));
  const addSeller = () => sellers.length < 4 && setSellers(prev => [...prev, blankPerson()]);
  const removeSeller = (i: number) => sellers.filter((_, idx) => idx !== i) && setSellers(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!property.address) {
      toast.error("Property address is required.");
      return;
    }

    // ---- Apply rules engine to seed the document checklist ----
    const txTypeForRules = type; // "Listing" | "Buyer File"
    const triggerCtx: Record<string, string> = {
      transactionType: txTypeForRules,
      propertyType: property.propertyType,
      exemptSeller: property.exemptSeller === "yes" ? "Yes" : "No",
      hoa: property.hoa === "yes" ? "Yes" : "No",
      tenantOccupied: property.tenantOccupied === "yes" ? "Yes" : "No",
      county: property.county,
      dualAgency: "No",
      financing: transaction.loanType,
    };
    const matches = (val: string, expect: string) =>
      expect === "Any" || expect === "*" || val === expect;
    const ruleMatches = (rule: typeof conditionalFormattingRules[number]) =>
      rule.isActive && rule.triggers.every((t) => matches(triggerCtx[t.field] ?? "", t.value));

    // 1) standard baseline docs
    const standardDocs: DocumentRule[] = conditionalFormattingRules
      .filter((r) => r.kind === "standard" && ruleMatches(r))
      .flatMap((r) => r.documents);

    // 2) conditional overlays
    const docsByName = new Map<string, { id: string; name: string; required: boolean; section?: string }>();
    standardDocs.forEach((d) =>
      docsByName.set(d.name, { id: d.id, name: d.name, required: d.required, section: d.section })
    );
    const naSet = new Set<string>();
    conditionalFormattingRules
      .filter((r) => r.kind === "conditional" && ruleMatches(r))
      .forEach((r) =>
        r.actions.forEach((a) => {
          if (a.action === "add-required") {
            docsByName.set(a.documentName, { id: `r-${a.id}`, name: a.documentName, required: true });
          } else if (a.action === "add-optional") {
            docsByName.set(a.documentName, { id: `r-${a.id}`, name: a.documentName, required: false });
          } else if (a.action === "mark-na") {
            naSet.add(a.documentName);
          }
        })
      );

    const documents = Array.from(docsByName.values()).map((d) => ({
      id: d.id,
      name: d.name,
      required: d.required,
      status: (naSet.has(d.name) ? "Other" : "Pending") as "Pending" | "Other",
      notes: [],
      attachedFileIds: [] as string[],
      ...(naSet.has(d.name) ? { customStatus: "N/A" as string } : {}),
    }));

    // ---- Compose project record ----
    const linkedClient = clients.find((c) => c.id === clientId);
    const initialStage: ProjectStage = type === "Listing" ? "Listing Prep" : "In Escrow";
    const fullAddress = [property.address, property.city, property.state, property.zip]
      .filter(Boolean)
      .join(", ");

    const created = addProject({
      name: `${property.address} — ${linkedClient?.name?.split(" ").slice(-1)[0] || "New"} ${type === "Listing" ? "Listing" : "Buyer"}`,
      clientId: clientId || (linkedClient?.id ?? ""),
      clientName: linkedClient?.name || "Unassigned",
      propertyAddress: fullAddress || property.address,
      type: type as unknown as ProjectType,
      stage: initialStage,
      nextStep: nextStep || "Define next step",
      nextStepDate: nextStepDate || "",
      yearBuilt: property.yearBuilt,
      propertyType: property.propertyType,
      representationSide: type === "Listing" ? "Seller" : "Buyer",
      escrowOfficer: escrow.name || "TBD",
      escrowCompany: escrow.company || "TBD",
      listPrice: transaction.purchasePrice || "—",
      documents,
    });

    toast.success("Transaction created!", {
      description: `${type} for ${property.address} · ${documents.length} docs auto-loaded from rules`,
    });
    navigate(`/projects/${created.id}`);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <button onClick={() => navigate("/projects")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Projects
      </button>
      <PageHeader title="New Transaction" subtitle="Set up a new Listing or Buyer File transaction." />

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Transaction type + client (always visible at top) */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-5">
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Transaction Type *</Label>
            <RadioGroup value={type} onValueChange={(v) => setType(v as TxType)} className="grid grid-cols-2 gap-3">
              {(["Listing", "Buyer File"] as TxType[]).map(t => (
                <label
                  key={t}
                  className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    type === t ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
                  }`}
                >
                  <RadioGroupItem value={t} id={`type-${t}`} />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t}</p>
                    <p className="text-xs text-muted-foreground">
                      {t === "Listing" ? "Seller-side transaction (uses all stages)" : "Buyer-side transaction (skips Listing Prep & Listing Complete)"}
                    </p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Link to Client (optional)</Label>
            <Select value={clientId} onValueChange={onClientChange}>
              <SelectTrigger><SelectValue placeholder="Search or select a client..." /></SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name} — {c.company}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* General */}
        <Section title="General" open={open.general} onToggle={() => toggle("general")}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Next Step">
              <Input value={nextStep} onChange={e => setNextStep(e.target.value)} placeholder="e.g. Send disclosure packet to seller" />
            </Field>
            <Field label="Next Step Date">
              <Input type="date" value={nextStepDate} onChange={e => setNextStepDate(e.target.value)} />
            </Field>
          </div>
        </Section>

        {/* Timeline */}
        <Section title="Timeline" open={open.timeline} onToggle={() => toggle("timeline")}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DateRow label="Contract Date" value={timeline.contractDate} onChange={v => setTimeline(p => ({ ...p, contractDate: v }))} />
            <DateRow label="Acceptance Date" value={timeline.acceptanceDate} onChange={v => setTimeline(p => ({ ...p, acceptanceDate: v }))} />
            <DateRow
              label="Preapproval"
              value={timeline.preapproval}
              onChange={v => setTimeline(p => ({ ...p, preapproval: v }))}
              disabled={isAllCash}
              disabledHint="Auto N/A — All Cash"
            />
            <DateRow label="Verification of Funds" value={timeline.verificationOfFunds} onChange={v => setTimeline(p => ({ ...p, verificationOfFunds: v }))} />
            <DateRow label="EMD to Escrow" value={timeline.emdToEscrow} onChange={v => setTimeline(p => ({ ...p, emdToEscrow: v }))} />
            <DateRow label="Seller Disclosures to Buyer" value={timeline.sellerDisclosuresToBuyer} onChange={v => setTimeline(p => ({ ...p, sellerDisclosuresToBuyer: v }))} />
            <DateRow label="Investigation Contingency Removal" value={timeline.investigationContingency} onChange={v => setTimeline(p => ({ ...p, investigationContingency: v }))} />
            <DateRow label="Insurance Contingency Removal" value={timeline.insuranceContingency} onChange={v => setTimeline(p => ({ ...p, insuranceContingency: v }))} />
            <DateRow label="Review of Seller Docs Contingency Removal" value={timeline.reviewSellerDocs} onChange={v => setTimeline(p => ({ ...p, reviewSellerDocs: v }))} />
            <DateRow label="Review of Prelim Contingency Removal" value={timeline.reviewPrelim} onChange={v => setTimeline(p => ({ ...p, reviewPrelim: v }))} />
            <DateRow
              label="Review of Comm Int Discl Contingency Removal"
              value={timeline.reviewCommIntDiscl}
              onChange={v => setTimeline(p => ({ ...p, reviewCommIntDiscl: v }))}
              disabled={noHOA}
              disabledHint="Auto N/A — No HOA"
            />
            <DateRow label="Appraisal Contingency Removal" value={timeline.appraisalContingency} onChange={v => setTimeline(p => ({ ...p, appraisalContingency: v }))} />
            <DateRow
              label="Loan Contingency Removal"
              value={timeline.loanContingency}
              onChange={v => setTimeline(p => ({ ...p, loanContingency: v }))}
              disabled={isAllCash}
              disabledHint="Auto N/A — All Cash"
            />
            <Field label="Verification of Property Condition" hint="Default: Within 5 days prior to COE">
              <Input value={timeline.verificationOfPropertyCondition} onChange={e => setTimeline(p => ({ ...p, verificationOfPropertyCondition: e.target.value }))} />
            </Field>
            <DateRow label="Estimated COE" value={timeline.estimatedCOE} onChange={v => setTimeline(p => ({ ...p, estimatedCOE: v }))} />
            <Field label="Possession" hint="Default: Upon notice of recordation">
              <Input value={timeline.possession} onChange={e => setTimeline(p => ({ ...p, possession: e.target.value }))} />
            </Field>
          </div>

          {/* Conditional COP / SPRP */}
          <div className="mt-5 pt-5 border-t border-border space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox id="cop-toggle" checked={showCOP} onCheckedChange={(v) => setShowCOP(!!v)} />
              <Label htmlFor="cop-toggle" className="cursor-pointer text-sm">
                Add <strong>Contingency for the Sale of the Buyer's Property (COP)</strong> dates
              </Label>
            </div>
            {showCOP && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                <DateRow label="COP — Into Contract" value={cop.intoContract} onChange={v => setCop(p => ({ ...p, intoContract: v }))} />
                <DateRow label="COP — COE" value={cop.coe} onChange={v => setCop(p => ({ ...p, coe: v }))} />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Checkbox id="sprp-toggle" checked={showSPRP} onCheckedChange={(v) => setShowSPRP(!!v)} />
              <Label htmlFor="sprp-toggle" className="cursor-pointer text-sm">
                Add <strong>Seller Purchase of Replacement Property (SPRP)</strong> dates
              </Label>
            </div>
            {showSPRP && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                <DateRow label="SPRP — Into Contract" value={sprp.intoContract} onChange={v => setSprp(p => ({ ...p, intoContract: v }))} />
                <DateRow label="SPRP — COE" value={sprp.coe} onChange={v => setSprp(p => ({ ...p, coe: v }))} />
              </div>
            )}
          </div>
        </Section>

        {/* Parties */}
        <Section title="Parties" open={open.parties} onToggle={() => toggle("parties")}>
          <div className="space-y-6">
            <PartyGroup title="Buyer's Agent">
              <AgentForm value={buyerAgents[0]} onChange={a => setBuyerAgents([a, ...buyerAgents.slice(1)])} />
            </PartyGroup>
            <PartyGroup title="Buyer's Agent 2 (optional)">
              <AgentForm value={buyerAgents[1] || blankAgent()} onChange={a => {
                const next = [...buyerAgents]; next[1] = a; setBuyerAgents(next);
              }} />
            </PartyGroup>
            <div className="flex items-center gap-2">
              <Checkbox id="add-buyer-agent" checked={additionalBuyerAgent} onCheckedChange={(v) => setAdditionalBuyerAgent(!!v)} />
              <Label htmlFor="add-buyer-agent" className="cursor-pointer text-sm">Add Additional Buyer's Agent</Label>
            </div>
            {additionalBuyerAgent && (
              <PartyGroup title="Additional Buyer's Agent">
                <AgentForm value={buyerAgent3} onChange={setBuyerAgent3} />
              </PartyGroup>
            )}
            <PartyGroup title="Buyer's Agent's TC">
              <SimpleForm value={buyerAgentTC} onChange={setBuyerAgentTC} />
            </PartyGroup>
            <PartyGroup title="Buyer's Agent's Assistant">
              <SimpleForm value={buyerAgentAssistant} onChange={setBuyerAgentAssistant} />
            </PartyGroup>

            <PartyGroup title="Listing Agent">
              <AgentForm value={listingAgents[0]} onChange={a => setListingAgents([a, ...listingAgents.slice(1)])} />
            </PartyGroup>
            <PartyGroup title="Listing Agent 2 (optional)">
              <AgentForm value={listingAgents[1] || blankAgent()} onChange={a => {
                const next = [...listingAgents]; next[1] = a; setListingAgents(next);
              }} />
            </PartyGroup>
            <div className="flex items-center gap-2">
              <Checkbox id="add-listing-agent" checked={additionalListingAgent} onCheckedChange={(v) => setAdditionalListingAgent(!!v)} />
              <Label htmlFor="add-listing-agent" className="cursor-pointer text-sm">Add Additional Listing Agent</Label>
            </div>
            {additionalListingAgent && (
              <PartyGroup title="Additional Listing Agent">
                <AgentForm value={listingAgent3} onChange={setListingAgent3} />
              </PartyGroup>
            )}
            <PartyGroup title="Listing Agent's TC">
              <SimpleForm value={listingAgentTC} onChange={setListingAgentTC} />
            </PartyGroup>

            <PartyGroup title="Escrow Officer">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Name"><Input value={escrow.name} onChange={e => setEscrow({ ...escrow, name: e.target.value })} /></Field>
                <Field label="Email"><Input type="email" value={escrow.email} onChange={e => setEscrow({ ...escrow, email: e.target.value })} /></Field>
                <Field label="Phone"><Input value={escrow.phone} onChange={e => setEscrow({ ...escrow, phone: e.target.value })} /></Field>
                <Field label="Company"><Input value={escrow.company} onChange={e => setEscrow({ ...escrow, company: e.target.value })} /></Field>
                <Field label="Address" className="md:col-span-2"><Input value={escrow.address} onChange={e => setEscrow({ ...escrow, address: e.target.value })} /></Field>
                <Field label="City, State, Zip" className="md:col-span-2"><Input value={escrow.cityStateZip} onChange={e => setEscrow({ ...escrow, cityStateZip: e.target.value })} /></Field>
              </div>
            </PartyGroup>
            <PartyGroup title="Escrow Assistant">
              <SimpleForm value={escrowAssistant} onChange={setEscrowAssistant} />
            </PartyGroup>

            <PartyGroup title="Lender">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Name"><Input value={lender.name} onChange={e => setLender({ ...lender, name: e.target.value })} /></Field>
                <Field label="Company"><Input value={lender.company} onChange={e => setLender({ ...lender, company: e.target.value })} /></Field>
              </div>
            </PartyGroup>

            {/* Sellers */}
            <PartyGroup
              title={`Sellers (${sellers.length}/4)`}
              action={sellers.length < 4 && (
                <Button type="button" size="sm" variant="outline" onClick={addSeller} className="gap-1">
                  <Plus className="w-3 h-3" /> Add Seller
                </Button>
              )}
            >
              <div className="space-y-4">
                {sellers.map((s, i) => (
                  <div key={i} className="bg-secondary/30 rounded-lg p-3 relative">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Seller {i + 1}</p>
                      {sellers.length > 1 && (
                        <button type="button" onClick={() => removeSeller(i)} className="text-muted-foreground hover:text-destructive">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <PersonForm value={s} onChange={(v) => {
                      const next = [...sellers]; next[i] = v; setSellers(next);
                    }} />
                  </div>
                ))}
              </div>
            </PartyGroup>

            {/* Buyers */}
            <PartyGroup
              title={`Buyers (${buyers.length}/4)`}
              action={buyers.length < 4 && (
                <Button type="button" size="sm" variant="outline" onClick={addBuyer} className="gap-1">
                  <Plus className="w-3 h-3" /> Add Buyer
                </Button>
              )}
            >
              <div className="space-y-4">
                {buyers.map((b, i) => (
                  <div key={i} className="bg-secondary/30 rounded-lg p-3 relative">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Buyer {i + 1}</p>
                      {buyers.length > 1 && (
                        <button type="button" onClick={() => removeBuyer(i)} className="text-muted-foreground hover:text-destructive">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <PersonForm value={b} onChange={(v) => {
                      const next = [...buyers]; next[i] = v; setBuyers(next);
                    }} />
                  </div>
                ))}
              </div>
            </PartyGroup>
          </div>
        </Section>

        {/* Listing Details (Listing only) */}
        {isListing && (
          <Section title="Listing Details" open={open.listing} onToggle={() => toggle("listing")} subtitle="Listing files only">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Target OMD"><Input value={listing.targetOMD} onChange={e => setListing(p => ({ ...p, targetOMD: e.target.value }))} placeholder="Fill in the blank" /></Field>
              <Field label="Disclosure Timing"><Input value={listing.disclosureTiming} onChange={e => setListing(p => ({ ...p, disclosureTiming: e.target.value }))} placeholder="Fill in the blank" /></Field>
              <YesNoField label="Questionnaires Electronically?" value={listing.questionnairesElectronically} onChange={(v) => setListing(p => ({ ...p, questionnairesElectronically: v }))} />
              <YesNoField label="DocuSign?" value={listing.docuSign} onChange={(v) => setListing(p => ({ ...p, docuSign: v }))} />
              <Field label="NHD Company"><Input value={listing.nhdCompany} onChange={e => setListing(p => ({ ...p, nhdCompany: e.target.value }))} /></Field>
              <div className="flex items-end gap-2">
                <Checkbox id="env" checked={listing.nhdEnvironmental} onCheckedChange={(v) => setListing(p => ({ ...p, nhdEnvironmental: !!v }))} />
                <Label htmlFor="env" className="cursor-pointer mb-2">With Environmental</Label>
              </div>
            </div>
          </Section>
        )}

        {/* Transaction Details */}
        <Section title="Transaction Details" open={open.transaction} onToggle={() => toggle("transaction")}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Purchase Price ($)"><Input value={transaction.purchasePrice} onChange={e => setTransaction(p => ({ ...p, purchasePrice: e.target.value }))} placeholder="$1,250,000" /></Field>
            <YesNoField label="DocuSign?" value={transaction.docuSign} onChange={(v) => setTransaction(p => ({ ...p, docuSign: v }))} />
            <Field label="Loan Type">
              <Select value={transaction.loanType} onValueChange={(v) => setTransaction(p => ({ ...p, loanType: v as LoanType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["Conventional", "FHA/VA", "All Cash", "Other"] as LoanType[]).map(l => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="SPBB %"><Input value={transaction.spbbPct} onChange={e => setTransaction(p => ({ ...p, spbbPct: e.target.value }))} placeholder="2.5%" /></Field>
            <YesNoField label="FTC?" value={transaction.ftc} onChange={(v) => setTransaction(p => ({ ...p, ftc: v }))} />
            {transaction.ftc === "yes" && (
              <>
                <Field label="FTC Amount ($)"><Input value={transaction.ftcAmount} onChange={e => setTransaction(p => ({ ...p, ftcAmount: e.target.value }))} placeholder="$5,000" /></Field>
                <Field label="FTC Paid By">
                  <Select value={transaction.ftcPaidBy} onValueChange={(v) => setTransaction(p => ({ ...p, ftcPaidBy: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Buyer">Buyer</SelectItem>
                      <SelectItem value="Seller">Seller</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </>
            )}
            <Field label="NHD Details (RPA)" className="md:col-span-2"><Input value={transaction.nhdRpa} onChange={e => setTransaction(p => ({ ...p, nhdRpa: e.target.value }))} placeholder="Company, with/without environmental, who pays" /></Field>
            <Field label="Home Warranty"><Input value={transaction.homeWarranty} onChange={e => setTransaction(p => ({ ...p, homeWarranty: e.target.value }))} /></Field>
            <Field label="Escrow #"><Input value={transaction.escrowNumber} onChange={e => setTransaction(p => ({ ...p, escrowNumber: e.target.value }))} /></Field>
            <Field label="Transaction Notes" className="md:col-span-2">
              <Textarea value={transaction.notes} onChange={e => setTransaction(p => ({ ...p, notes: e.target.value }))} rows={3} />
            </Field>
          </div>
        </Section>

        {/* Property Information */}
        <Section title="Property Information" open={open.property} onToggle={() => toggle("property")}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="MLS #"><Input value={property.mlsNumber} onChange={e => setProperty(p => ({ ...p, mlsNumber: e.target.value }))} /></Field>
            <Field label="Property Type">
              <Select value={property.propertyType} onValueChange={(v) => setProperty(p => ({ ...p, propertyType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["SFR", "Condo", "Vacant Land", "Townhouse", "Multi-Family", "Other"].map(o => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Property Address *" className="md:col-span-2"><Input value={property.address} onChange={e => setProperty(p => ({ ...p, address: e.target.value }))} required /></Field>
            <Field label="City"><Input value={property.city} onChange={e => setProperty(p => ({ ...p, city: e.target.value }))} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="State"><Input value={property.state} onChange={e => setProperty(p => ({ ...p, state: e.target.value }))} /></Field>
              <Field label="ZIP"><Input value={property.zip} onChange={e => setProperty(p => ({ ...p, zip: e.target.value }))} /></Field>
            </div>
            <Field label="County"><Input value={property.county} onChange={e => setProperty(p => ({ ...p, county: e.target.value }))} /></Field>
            <Field label="Year Built"><Input value={property.yearBuilt} onChange={e => setProperty(p => ({ ...p, yearBuilt: e.target.value }))} /></Field>
            <Field label="Lot Size"><Input value={property.lotSize} onChange={e => setProperty(p => ({ ...p, lotSize: e.target.value }))} /></Field>
            <Field label="Square Feet (home)"><Input value={property.squareFeet} onChange={e => setProperty(p => ({ ...p, squareFeet: e.target.value }))} /></Field>
            <Field label="Disclosure Link" className="md:col-span-2"><Input value={property.disclosureLink} onChange={e => setProperty(p => ({ ...p, disclosureLink: e.target.value }))} placeholder="https://..." /></Field>

            <YesNoField label="Exempt Seller?" value={property.exemptSeller} onChange={(v) => setProperty(p => ({ ...p, exemptSeller: v }))} />
            <YesNoField label="Solar?" value={property.solar} onChange={(v) => setProperty(p => ({ ...p, solar: v }))} />
            <YesNoField label="Well?" value={property.well} onChange={(v) => setProperty(p => ({ ...p, well: v }))} />
            <YesNoField label="Septic?" value={property.septic} onChange={(v) => setProperty(p => ({ ...p, septic: v }))} />
            <YesNoField label="HOA?" value={property.hoa} onChange={(v) => setProperty(p => ({ ...p, hoa: v }))} />
            <YesNoField label="Tenant Occupied?" value={property.tenantOccupied} onChange={(v) => setProperty(p => ({ ...p, tenantOccupied: v }))} />
            {isListing && property.hoa === "yes" && (
              <Field label="HOA Order Details" className="md:col-span-2">
                <Input value={property.hoaOrderDetails} onChange={e => setProperty(p => ({ ...p, hoaOrderDetails: e.target.value }))} placeholder="Listing files only — fill in details" />
              </Field>
            )}
          </div>
        </Section>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate("/projects")}>Cancel</Button>
          <Button type="submit">Create Transaction</Button>
        </div>
      </form>
    </div>
  );
}

/* ---------- Reusable building blocks ---------- */

function Section({
  title, subtitle, open, onToggle, children,
}: { title: string; subtitle?: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-secondary/30 transition-colors text-left"
      >
        <div>
          <h3 className="font-display font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-6 pb-6 pt-2 border-t border-border">{children}</div>}
    </div>
  );
}

function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs">{label}</Label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function DateRow({
  label, value, onChange, disabled, disabledHint,
}: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean; disabledHint?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        {disabled && (
          <span className="text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
            <Info className="w-2.5 h-2.5" /> N/A
          </span>
        )}
      </div>
      <Input type="date" value={disabled ? "" : value} onChange={e => onChange(e.target.value)} disabled={disabled} placeholder={disabled ? disabledHint : ""} />
      {disabled && disabledHint && <p className="text-[10px] text-muted-foreground italic">{disabledHint}</p>}
    </div>
  );
}

function YesNoField({ label, value, onChange }: { label: string; value: "yes" | "no" | ""; onChange: (v: "yes" | "no") => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2">
        {(["yes", "no"] as const).map(v => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`flex-1 h-10 rounded-md border text-sm font-medium capitalize transition-colors ${
              value === v
                ? "bg-accent/15 border-accent text-foreground"
                : "border-border bg-background hover:border-accent/50 text-muted-foreground"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

function PartyGroup({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-accent/30 pl-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

function AgentForm({ value, onChange }: { value: AgentParty; onChange: (v: AgentParty) => void }) {
  const set = (k: keyof AgentParty, v: string) => onChange({ ...value, [k]: v });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Field label="Name"><Input value={value.name} onChange={e => set("name", e.target.value)} /></Field>
      <Field label="Email"><Input type="email" value={value.email} onChange={e => set("email", e.target.value)} /></Field>
      <Field label="Phone"><Input value={value.phone} onChange={e => set("phone", e.target.value)} /></Field>
      <Field label="License Number"><Input value={value.licenseNumber} onChange={e => set("licenseNumber", e.target.value)} /></Field>
      <Field label="Brokerage"><Input value={value.brokerage} onChange={e => set("brokerage", e.target.value)} /></Field>
      <Field label="Brokerage License Number"><Input value={value.brokerageLicense} onChange={e => set("brokerageLicense", e.target.value)} /></Field>
      <Field label="Agent Notes" className="md:col-span-2" hint="Notes specific to this agent (e.g. always add environmental to JCP report)">
        <Textarea value={value.notes} onChange={e => set("notes", e.target.value)} rows={2} />
      </Field>
    </div>
  );
}

function SimpleForm({ value, onChange }: { value: SimpleParty; onChange: (v: SimpleParty) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Field label="Name"><Input value={value.name} onChange={e => onChange({ ...value, name: e.target.value })} /></Field>
      <Field label="Email"><Input type="email" value={value.email} onChange={e => onChange({ ...value, email: e.target.value })} /></Field>
    </div>
  );
}

function PersonForm({ value, onChange }: { value: PersonParty; onChange: (v: PersonParty) => void }) {
  const set = (k: keyof PersonParty, v: string) => onChange({ ...value, [k]: v });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Field label="Name"><Input value={value.name} onChange={e => set("name", e.target.value)} /></Field>
      <Field label="Email"><Input type="email" value={value.email} onChange={e => set("email", e.target.value)} /></Field>
      <Field label="Salutation"><Input value={value.salutation} onChange={e => set("salutation", e.target.value)} placeholder="Mr., Mrs., Dr." /></Field>
      <Field label="Title"><Input value={value.title} onChange={e => set("title", e.target.value)} /></Field>
      <Field label="Entity Type"><Input value={value.entityType} onChange={e => set("entityType", e.target.value)} placeholder="Individual, Trust, LLC..." /></Field>
      <Field label="Entity Name"><Input value={value.entityName} onChange={e => set("entityName", e.target.value)} /></Field>
    </div>
  );
}
