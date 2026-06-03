import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronRight, Plus, X, Info } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store/appStore";
import { createProjectApi, getProjectFromApi, updateProjectApi } from "@/api/projects";
import { listClientsFromApi } from "@/api/clients";
import { listDocumentRulesFromApi } from "@/api/documentRules";
import { listEsignDocumentsApi, type EsignDocumentDto } from "@/api/esign";
import { getApiBaseUrl } from "@/lib/apiConfig";
import {
  CRM_DOCUMENT_VAULT_PROJECT_ID,
  type ConditionalFormattingRule,
  type ProjectStage,
  type ProjectType,
} from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PrimaryContactPicker } from "@/components/shared/PrimaryContactPicker";
import { ContactLinkPicker } from "@/components/shared/ContactLinkPicker";
import type { Client } from "@/types/domain";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import PageHeader from "@/components/shared/PageHeader";
import FieldLabelHelp from "@/components/shared/FieldLabelHelp";
import { TX_FIELD_HELP, type TransactionFieldHelp } from "@/lib/transactionFieldHelp";
import { toast } from "sonner";

type TxType = "Listing" | "Buyer File";
type LoanType = "Conventional" | "FHA/VA" | "All Cash" | "Other";
type YesNo = "yes" | "no" | "";
type WorkflowStep = "core" | "parties" | "timeline" | "listing" | "review";

function normalizeSellerName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isValidEmail(value: string): boolean {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function sanitizeDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function sanitizeDecimal(value: string): string {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  const decimal = rest.join("");
  return decimal.length > 0 ? `${whole}.${decimal}` : whole;
}

function sanitizePercent(value: string): string {
  return sanitizeDecimal(value).replace(/^(\d+(\.\d{0,2})?).*$/, "$1");
}

type TransactionFormValidationInput = {
  type: TxType;
  clientId: string;
  propertyAddress: string;
  nextStep: string;
  purchasePrice: string;
  property: {
    zip: string;
    yearBuilt: string;
    squareFeet: string;
    lotSize: string;
    mlsNumber: string;
  };
  transaction: { purchasePrice: string; spbbPct: string; ftcAmount: string };
  escrow: { phone: string };
  emailsToValidate: string[];
  textFields: string[];
};

type RequiredFormItem = { key: string; label: string; valid: boolean; step: WorkflowStep; message: string };

function getTransactionFormValidation(input: TransactionFormValidationInput): {
  requiredItems: RequiredFormItem[];
  missingRequired: RequiredFormItem[];
  formatErrors: string[];
  canSubmit: boolean;
} {
  const requiredItems: RequiredFormItem[] = [
    { key: "type", label: "Transaction Type", valid: Boolean(input.type), step: "core", message: "Transaction type is required." },
    {
      key: "contact",
      label: "Primary Contact",
      valid: /^\d+$/.test(input.clientId.trim()),
      step: "core",
      message: "Primary contact is required.",
    },
    {
      key: "address",
      label: "Property Address",
      valid: Boolean(input.propertyAddress.trim()),
      step: "core",
      message: "Property address is required.",
    },
    {
      key: "next-step",
      label: "Next Step",
      valid: Boolean(input.nextStep.trim()),
      step: "core",
      message: "Next step is required.",
    },
    {
      key: "price",
      label: "Purchase Price",
      valid: Boolean(input.purchasePrice.trim()) && /^\d+(\.\d+)?$/.test(input.purchasePrice.trim()),
      step: "core",
      message: "Purchase price is required and must be a valid number.",
    },
  ];
  const missingRequired = requiredItems.filter((item) => !item.valid);

  const formatErrors: string[] = [];
  const { property, transaction, escrow } = input;
  if (property.zip && !/^\d+$/.test(property.zip)) formatErrors.push("ZIP must contain numbers only.");
  if (property.yearBuilt && !/^\d+$/.test(property.yearBuilt)) formatErrors.push("Year Built must contain numbers only.");
  if (property.squareFeet && !/^\d+$/.test(property.squareFeet)) formatErrors.push("Square Feet must contain numbers only.");
  if (property.lotSize && !/^\d+(\.\d+)?$/.test(property.lotSize)) formatErrors.push("Lot Size must be a valid number.");
  if (property.mlsNumber && !/^\d+$/.test(property.mlsNumber)) formatErrors.push("MLS # must contain numbers only.");
  if (transaction.purchasePrice.trim() && !/^\d+(\.\d+)?$/.test(transaction.purchasePrice.trim())) {
    formatErrors.push("Purchase Price must be a valid number.");
  }
  if (transaction.spbbPct && !/^\d+(\.\d{1,2})?$/.test(transaction.spbbPct)) formatErrors.push("SPBB % must be a valid percentage.");
  if (transaction.ftcAmount && !/^\d+(\.\d+)?$/.test(transaction.ftcAmount)) formatErrors.push("FTC Amount must be a valid number.");
  if (escrow.phone && !/^\d+$/.test(escrow.phone)) formatErrors.push("Escrow phone must contain numbers only.");
  if (input.emailsToValidate.some((email) => !isValidEmail(email))) {
    formatErrors.push("One or more email addresses are invalid.");
  }
  if (input.textFields.some((text) => text.trim() && /^\d+$/.test(text.trim()))) {
    formatErrors.push("Text fields cannot be numbers only.");
  }

  return {
    requiredItems,
    missingRequired,
    formatErrors,
    canSubmit: missingRequired.length === 0 && formatErrors.length === 0,
  };
}

/** Rules use "Yes" / "No"; unset must not be treated as "No" or conditional rules misfire. */
function yesNoToRuleTrigger(v: YesNo): string {
  if (v === "yes") return "Yes";
  if (v === "no") return "No";
  return "";
}

function ruleTriggerMatches(field: string, actual: string, expect: string): boolean {
  if (expect === "Any" || expect === "*") return true;
  const a = actual.trim().toLowerCase();
  const e = expect.trim().toLowerCase();
  if (a === e) return true;
  /* New transaction form uses a single "FHA/VA" loan type; rules may still use FHA or VA. */
  if (field === "financing" && actual === "FHA/VA" && (e === "fha" || e === "va")) return true;
  return false;
}

/** Prefer send-ready layouts when several vault drafts share the same `originalFileId`. */
function esignTemplatePickScore(d: EsignDocumentDto): number {
  switch (d.status) {
    case "ready_for_send":
      return 5;
    case "editing":
      return 4;
    case "draft_uploaded":
      return 3;
    case "sent":
      return 2;
    case "completed":
      return 1;
    default:
      return 0;
  }
}

function compareVaultDraftsSameOriginalFile(a: EsignDocumentDto, b: EsignDocumentDto): number {
  const s = esignTemplatePickScore(b) - esignTemplatePickScore(a);
  if (s !== 0) return s;
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

/** Map vault `stored_files.id` → best `esign_documents.id` for checklist linking (DocuSign). */
async function loadVaultEsignByOriginalFileIdMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!getApiBaseUrl()) return map;
  try {
    const vaultDrafts = await listEsignDocumentsApi(CRM_DOCUMENT_VAULT_PROJECT_ID);
    const byOriginal = new Map<string, EsignDocumentDto[]>();
    for (const ed of vaultDrafts) {
      if (!ed.originalFileId) continue;
      const list = byOriginal.get(ed.originalFileId) ?? [];
      list.push(ed);
      byOriginal.set(ed.originalFileId, list);
    }
    for (const [originalId, list] of byOriginal) {
      if (list.length === 0) continue;
      list.sort(compareVaultDraftsSameOriginalFile);
      map.set(originalId, list[0]!.id);
    }
  } catch {
    /* vault e-sign list optional */
  }
  return map;
}

interface AgentParty {
  contactId?: string;
  name: string; email: string; phone: string;
  licenseNumber: string; brokerage: string; brokerageLicense: string;
  notes: string;
}
interface SimpleParty { contactId?: string; name: string; email: string; }
interface EscrowParty {
  contactId?: string;
  name: string; email: string; phone: string; company: string;
  address: string; cityStateZip: string;
}
interface PersonParty {
  contactId?: string;
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

function labelFromClient(c: Client): string {
  return (c.preferredName?.trim()) || c.name;
}

function applyAgentContact(prev: AgentParty, id: string, options: Client[]): AgentParty {
  if (!id) return { ...prev, contactId: undefined };
  const c = options.find((x) => x.id === id);
  if (!c) return { ...prev, contactId: id };
  return {
    ...prev,
    contactId: id,
    name: labelFromClient(c),
    email: c.email || prev.email,
    phone: c.phone || prev.phone,
    brokerage: c.company || prev.brokerage,
  };
}

function applySimpleContact(prev: SimpleParty, id: string, options: Client[]): SimpleParty {
  if (!id) return { ...prev, contactId: undefined };
  const c = options.find((x) => x.id === id);
  if (!c) return { ...prev, contactId: id };
  return {
    ...prev,
    contactId: id,
    name: labelFromClient(c),
    email: c.email || prev.email,
  };
}

function applyEscrowContact(prev: EscrowParty, id: string, options: Client[]): EscrowParty {
  if (!id) return { ...prev, contactId: undefined };
  const c = options.find((x) => x.id === id);
  if (!c) return { ...prev, contactId: id };
  const cityLine = [c.city, c.state, c.zip].filter(Boolean).join(" ");
  return {
    ...prev,
    contactId: id,
    name: labelFromClient(c),
    email: c.email || prev.email,
    phone: c.phone || prev.phone,
    company: c.company || prev.company,
    address: c.propertyAddress || prev.address,
    cityStateZip: cityLine || prev.cityStateZip,
  };
}

function applyPersonContact(prev: PersonParty, id: string, options: Client[]): PersonParty {
  if (!id) return { ...prev, contactId: undefined };
  const c = options.find((x) => x.id === id);
  if (!c) return { ...prev, contactId: id };
  return {
    ...prev,
    contactId: id,
    name: labelFromClient(c),
    email: c.email || prev.email,
  };
}

function applyLenderContact(
  prev: { contactId?: string; name: string; company: string },
  id: string,
  options: Client[]
): { contactId?: string; name: string; company: string } {
  if (!id) return { ...prev, contactId: undefined };
  const c = options.find((x) => x.id === id);
  if (!c) return { ...prev, contactId: id };
  return {
    ...prev,
    contactId: id,
    name: labelFromClient(c),
    company: c.company || prev.company,
  };
}

export default function AddProjectPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const lastAppliedClientParam = useRef<string | null>(null);
  const clients = useAppStore((s) => s.clients);
  const existingProject = useAppStore((s) => (id ? s.projects.find((p) => p.id === id) : undefined));
  const addProject = useAppStore((s) => s.addProject);
  const upsertProject = useAppStore((s) => s.upsertProject);
  const apiOn = Boolean(getApiBaseUrl());
  const [clientOptions, setClientOptions] = useState(clients);
  const mergePartyClientOptions = () => {
    const fromStore = useAppStore.getState().clients;
    const byId = new Map<string, Client>();
    for (const c of clientOptions) byId.set(c.id, c);
    for (const c of fromStore) byId.set(c.id, c);
    return Array.from(byId.values());
  };
  const [ruleCatalog, setRuleCatalog] = useState<ConditionalFormattingRule[]>([]);
  const [loadingEditProject, setLoadingEditProject] = useState(false);

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
  const [showBuyerAgent2, setShowBuyerAgent2] = useState(false);
  const [additionalBuyerAgent, setAdditionalBuyerAgent] = useState(false);
  const [buyerAgent3, setBuyerAgent3] = useState<AgentParty>(blankAgent());
  const [buyerAgentTC, setBuyerAgentTC] = useState<SimpleParty>(blankSimple());
  const [buyerAgentAssistant, setBuyerAgentAssistant] = useState<SimpleParty>(blankSimple());
  const [listingAgents, setListingAgents] = useState<AgentParty[]>([blankAgent()]);
  const [showListingAgent2, setShowListingAgent2] = useState(false);
  const [additionalListingAgent, setAdditionalListingAgent] = useState(false);
  const [listingAgent3, setListingAgent3] = useState<AgentParty>(blankAgent());
  const [listingAgentTC, setListingAgentTC] = useState<SimpleParty>(blankSimple());
  const [escrow, setEscrow] = useState<EscrowParty>(blankEscrow());
  const [escrowAssistant, setEscrowAssistant] = useState<SimpleParty>(blankSimple());
  const [lender, setLender] = useState<{ contactId?: string; name: string; company: string }>({ name: "", company: "" });
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
    rpaSeller: "", prelimSeller: "",
    sellerMatchOverride: "" as YesNo,
    sellerMismatchNotes: "",
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
  const autoSellerNameMatch: YesNo =
    transaction.rpaSeller.trim() && transaction.prelimSeller.trim()
      ? normalizeSellerName(transaction.rpaSeller) === normalizeSellerName(transaction.prelimSeller)
        ? "yes"
        : "no"
      : "";
  const sellerNameMatchStatus: YesNo = transaction.sellerMatchOverride || autoSellerNameMatch;
  const hasListingAgent2Data = Boolean(
    listingAgents[1]?.name ||
      listingAgents[1]?.email ||
      listingAgents[1]?.phone ||
      listingAgents[1]?.contactId
  );
  const [currentStep, setCurrentStep] = useState<WorkflowStep>("core");
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const stepOrder: WorkflowStep[] = isListing
    ? ["core", "parties", "timeline", "listing", "review"]
    : ["core", "parties", "timeline", "review"];
  const stepTitle: Record<WorkflowStep, string> = {
    core: "Core Details",
    parties: "Parties",
    timeline: "Timeline",
    listing: "Listing Details",
    review: "Review + Save",
  };
  const formValidation = getTransactionFormValidation({
    type,
    clientId,
    propertyAddress: property.address,
    nextStep,
    purchasePrice: transaction.purchasePrice,
    property,
    transaction,
    escrow,
    emailsToValidate: [
      ...buyerAgents.map((a) => a.email),
      buyerAgent3.email,
      buyerAgentTC.email,
      buyerAgentAssistant.email,
      ...listingAgents.map((a) => a.email),
      listingAgent3.email,
      listingAgentTC.email,
      escrow.email,
      escrowAssistant.email,
      ...sellers.map((s) => s.email),
      ...buyers.map((b) => b.email),
    ],
    textFields: [
      ...buyerAgents.map((a) => a.name),
      buyerAgent3.name,
      buyerAgentTC.name,
      buyerAgentAssistant.name,
      ...listingAgents.map((a) => a.name),
      listingAgent3.name,
      listingAgentTC.name,
      escrow.name,
      lender.name,
      ...sellers.map((s) => s.name),
      ...buyers.map((b) => b.name),
      property.city,
      property.county,
    ],
  });
  const { requiredItems, missingRequired: missingRequiredItems, canSubmit: formCanSubmit } = formValidation;
  const requiredDone = requiredItems.filter((item) => item.valid).length;
  const requiredTotal = requiredItems.length;
  const linkedPrimaryContact = clientOptions.find((c) => c.id === clientId);
  const showFieldError = (key: string) =>
    submitAttempted && missingRequiredItems.some((item) => item.key === key);

  useEffect(() => {
    if (hasListingAgent2Data) setShowListingAgent2(true);
  }, [hasListingAgent2Data]);

  useEffect(() => {
    if (!apiOn) {
      setClientOptions(clients);
      setRuleCatalog([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [liveClients, liveRules] = await Promise.all([
          listClientsFromApi(),
          listDocumentRulesFromApi(),
        ]);
        if (!cancelled) {
          setClientOptions(liveClients);
          setRuleCatalog(liveRules);
        }
      } catch (e) {
        if (!cancelled) {
          setClientOptions(clients);
          setRuleCatalog([]);
          toast.error("Could not load contacts or document rules.", {
            description: e instanceof Error ? e.message : "Unknown error",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiOn, clients]);

  useEffect(() => {
    if (isEditMode) return;
    const cid = searchParams.get("clientId")?.trim();
    if (!cid || lastAppliedClientParam.current === cid) return;
    if (!clientOptions.some((c) => c.id === cid)) return;
    setClientId(cid);
    lastAppliedClientParam.current = cid;
  }, [isEditMode, searchParams, clientOptions]);

  useEffect(() => {
    if (!isEditMode || !id) return;
    let cancelled = false;
    const hydrate = (p: {
      clientId: string;
      type: ProjectType;
      nextStep: string;
      nextStepDate: string;
      yearBuilt: string;
      propertyType: string;
      propertyAddress: string;
      listPrice: string;
      escrowOfficer: string;
      escrowCompany: string;
      metadata?: Record<string, unknown>;
    }) => {
      setClientId(p.clientId);
      setType((p.type === "Buyer File" ? "Buyer File" : "Listing") as TxType);
      setNextStep(p.nextStep && p.nextStep !== "Define next step" ? p.nextStep : "");
      setNextStepDate(p.nextStepDate || "");
      const parts = (p.propertyAddress || "").split(",").map((x) => x.trim()).filter(Boolean);
      setProperty((prev) => ({
        ...prev,
        address: parts[0] || p.propertyAddress || "",
        city: parts[1] || "",
        state: parts[2] || prev.state,
        zip: parts[3] || "",
        yearBuilt: p.yearBuilt || "",
        propertyType: p.propertyType || prev.propertyType,
      }));
      setTransaction((prev) => ({
        ...prev,
        purchasePrice:
          !p.listPrice || p.listPrice === "—" ? "" : sanitizeDecimal(String(p.listPrice)),
      }));
      setEscrow((prev) => ({ ...prev, name: p.escrowOfficer || "", company: p.escrowCompany || "" }));
      const md = p.metadata ?? {};
      if (md.timeline && typeof md.timeline === "object") {
        setTimeline((prev) => ({ ...prev, ...(md.timeline as typeof prev) }));
      }
      if (md.cop && typeof md.cop === "object") {
        setShowCOP(true);
        setCop((md.cop as typeof cop) ?? { intoContract: "", coe: "" });
      }
      if (md.sprp && typeof md.sprp === "object") {
        setShowSPRP(true);
        setSprp((md.sprp as typeof sprp) ?? { intoContract: "", coe: "" });
      }
      if (md.buyerAgents && Array.isArray(md.buyerAgents) && md.buyerAgents.length > 0) {
        setBuyerAgents(md.buyerAgents as typeof buyerAgents);
      }
      if (md.listingAgents && Array.isArray(md.listingAgents) && md.listingAgents.length > 0) {
        setListingAgents(md.listingAgents as typeof listingAgents);
      }
      if (md.additionalBuyerAgent && typeof md.additionalBuyerAgent === "boolean") setAdditionalBuyerAgent(md.additionalBuyerAgent);
      if (md.additionalListingAgent && typeof md.additionalListingAgent === "boolean") setAdditionalListingAgent(md.additionalListingAgent);
      if (md.buyerAgent3 && typeof md.buyerAgent3 === "object") setBuyerAgent3(md.buyerAgent3 as typeof buyerAgent3);
      if (md.listingAgent3 && typeof md.listingAgent3 === "object") setListingAgent3(md.listingAgent3 as typeof listingAgent3);
      if (md.buyerAgentTC && typeof md.buyerAgentTC === "object") setBuyerAgentTC(md.buyerAgentTC as typeof buyerAgentTC);
      if (md.buyerAgentAssistant && typeof md.buyerAgentAssistant === "object") setBuyerAgentAssistant(md.buyerAgentAssistant as typeof buyerAgentAssistant);
      if (md.listingAgentTC && typeof md.listingAgentTC === "object") setListingAgentTC(md.listingAgentTC as typeof listingAgentTC);
      if (md.escrow && typeof md.escrow === "object") setEscrow(md.escrow as typeof escrow);
      if (md.escrowAssistant && typeof md.escrowAssistant === "object") setEscrowAssistant(md.escrowAssistant as typeof escrowAssistant);
      if (md.lender && typeof md.lender === "object") setLender(md.lender as typeof lender);
      if (md.sellers && Array.isArray(md.sellers) && md.sellers.length > 0) setSellers(md.sellers as typeof sellers);
      if (md.buyers && Array.isArray(md.buyers) && md.buyers.length > 0) setBuyers(md.buyers as typeof buyers);
      if (md.listing && typeof md.listing === "object") setListing((prev) => ({ ...prev, ...(md.listing as typeof prev) }));
      if (md.transaction && typeof md.transaction === "object") setTransaction((prev) => ({ ...prev, ...(md.transaction as typeof prev) }));
      if (md.property && typeof md.property === "object") setProperty((prev) => ({ ...prev, ...(md.property as typeof prev) }));
    };
    if (existingProject) {
      hydrate(existingProject);
      return;
    }
    if (!apiOn) return;
    setLoadingEditProject(true);
    void getProjectFromApi(id)
      .then((loaded) => {
        if (!cancelled) {
          upsertProject(loaded);
          hydrate(loaded);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Could not load project for editing.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingEditProject(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiOn, existingProject, id, isEditMode, upsertProject]);

  // Auto-fill from client
  const onClientChange = (v: string) => {
    setClientId(v);
    const c = clientOptions.find(x => x.id === v);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (formValidation.missingRequired.length > 0) {
      const labels = formValidation.missingRequired.map((item) => item.label).join(", ");
      toast.error(`Complete required fields: ${labels}`);
      setCurrentStep(formValidation.missingRequired[0]!.step);
      return;
    }
    if (formValidation.formatErrors.length > 0) {
      toast.error(formValidation.formatErrors[0]);
      return;
    }

    // ---- Apply rules engine to seed the document checklist ----
    const txTypeForRules = type; // "Listing" | "Buyer File"
    const triggerCtx: Record<string, string> = {
      transactionType: txTypeForRules,
      propertyType: property.propertyType,
      exemptSeller: yesNoToRuleTrigger(property.exemptSeller),
      hoa: yesNoToRuleTrigger(property.hoa),
      tenantOccupied: yesNoToRuleTrigger(property.tenantOccupied),
      county: property.county,
      dualAgency: "No",
      financing: transaction.loanType,
    };
    const matches = (field: string, val: string, expect: string) => ruleTriggerMatches(field, val, expect);
    const ruleMatches = (rule: typeof ruleCatalog[number]) =>
      rule.isActive && rule.triggers.every((t) => matches(t.field, triggerCtx[t.field] ?? "", t.value));

    // 1) standard baseline docs + source rule metadata
    // 2) conditional overlays
    const docsByName = new Map<string, {
      id: string;
      name: string;
      required: boolean;
      section?: string;
      sourceRuleId?: string;
      sourceRuleActionId?: string;
      /** Vault `stored_files.id` from document rule (PDF). */
      storedFileId?: string;
    }>();
    ruleCatalog
      .filter((r) => r.kind === "standard" && ruleMatches(r))
      .forEach((r) => {
        r.documents.forEach((d) =>
          docsByName.set(d.name, {
            id: d.id,
            name: d.name,
            required: d.required,
            section: d.section,
            sourceRuleId: r.id,
            sourceRuleActionId: d.id,
            storedFileId: d.storedFileId,
          })
        );
      });
    const naSet = new Set<string>();
    ruleCatalog
      .filter((r) => r.kind === "conditional" && ruleMatches(r))
      .forEach((r) =>
        r.actions.forEach((a) => {
          if (a.action === "add-required") {
            docsByName.set(a.documentName, {
              id: `r-${a.id}`,
              name: a.documentName,
              required: true,
              sourceRuleId: r.id,
              sourceRuleActionId: a.id,
              storedFileId: a.storedFileId,
            });
          } else if (a.action === "add-optional") {
            docsByName.set(a.documentName, {
              id: `r-${a.id}`,
              name: a.documentName,
              required: false,
              sourceRuleId: r.id,
              sourceRuleActionId: a.id,
              storedFileId: a.storedFileId,
            });
          } else if (a.action === "mark-na") {
            naSet.add(a.documentName);
          }
        })
      );

    const documents = Array.from(docsByName.values()).map((d) => {
      const fid = d.storedFileId?.trim();
      const attachedFileIds = fid && /^\d+$/.test(fid) ? [fid] : ([] as string[]);
      return {
        id: d.id,
        name: d.name,
        required: d.required,
        sourceRuleId: d.sourceRuleId,
        sourceRuleActionId: d.sourceRuleActionId,
        status: (naSet.has(d.name) ? "Other" : "Pending") as "Pending" | "Other",
        notes: [] as { date: string; text: string; author: string }[],
        attachedFileIds,
        ...(naSet.has(d.name) ? { customStatus: "N/A" as string } : {}),
      };
    });

    // ---- Compose project record ----
    const linkedClient = clientOptions.find((c) => c.id === clientId);
    const initialStage: ProjectStage = type === "Listing" ? "Listing Prep" : "In Escrow";
    const fullAddress = [property.address, property.city, property.state, property.zip]
      .filter(Boolean)
      .join(", ");
    const metadata = {
      timeline,
      cop,
      showCOP,
      sprp,
      showSPRP,
      buyerAgents,
      additionalBuyerAgent,
      buyerAgent3,
      buyerAgentTC,
      buyerAgentAssistant,
      listingAgents,
      additionalListingAgent,
      listingAgent3,
      listingAgentTC,
      escrow,
      escrowAssistant,
      lender,
      sellers,
      buyers,
      listing,
      transaction,
      property,
    };

    if (apiOn) {
      try {
        const esignByOriginalFile = await loadVaultEsignByOriginalFileIdMap();

        const payload = {
          name: `${property.address} — ${linkedClient?.name?.split(" ").slice(-1)[0] || "New"} ${type === "Listing" ? "Listing" : "Buyer"}`,
          clientId: clientId.trim(),
          propertyAddress: fullAddress || property.address,
          type,
          stage: initialStage,
          nextStep: nextStep.trim(),
          nextStepDate: nextStepDate || "",
          yearBuilt: property.yearBuilt,
          propertyType: property.propertyType,
          representationSide: type === "Listing" ? "Seller" : "Buyer",
          escrowOfficer: escrow.name || "",
          escrowCompany: escrow.company || "TBD",
          listPrice: transaction.purchasePrice.trim(),
          city: property.city,
          state: property.state,
          zip: property.zip,
          documents: documents.map((d) => {
            const fileId = d.attachedFileIds[0];
            const esignDocumentId = fileId ? esignByOriginalFile.get(fileId) : undefined;
            return {
              name: d.name,
              status: d.status,
              customStatus: d.customStatus,
              required: d.required,
              sourceRuleId: d.sourceRuleId,
              sourceRuleActionId: d.sourceRuleActionId,
              attachedFileIds: d.attachedFileIds.length ? d.attachedFileIds : undefined,
              ...(esignDocumentId ? { esignDocumentId } : {}),
            };
          }),
          metadata,
        };
        const saved = isEditMode && id
          ? await updateProjectApi(id, payload)
          : await createProjectApi(payload);
        upsertProject(saved);
        toast.success(isEditMode ? "Transaction updated!" : "Transaction created!", {
          description: isEditMode
            ? `${type} for ${property.address}`
            : `${type} for ${property.address} · ${documents.length} docs auto-loaded from rules`,
        });
        navigate(`/projects/${saved.id}`);
        return;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : isEditMode ? "Could not update transaction." : "Could not create transaction.");
        return;
      }
    }

    if (isEditMode && id) {
      upsertProject({
        ...(existingProject ?? {
          id,
          clientName: linkedClient?.name || "Unassigned",
          documents,
          tasks: [],
          emails: [],
          deadlines: [],
          attachments: [],
          fileFolders: [],
          createdAt: new Date().toISOString().split("T")[0],
        }),
        id,
        name: `${property.address} — ${linkedClient?.name?.split(" ").slice(-1)[0] || "New"} ${type === "Listing" ? "Listing" : "Buyer"}`,
        clientId: clientId.trim(),
        clientName: linkedClient?.name || "Unassigned",
        propertyAddress: fullAddress || property.address,
        type: type as unknown as ProjectType,
        stage: initialStage,
        nextStep: nextStep.trim(),
        nextStepDate: nextStepDate || "",
        yearBuilt: property.yearBuilt,
        propertyType: property.propertyType,
        representationSide: type === "Listing" ? "Seller" : "Buyer",
        escrowOfficer: escrow.name || "TBD",
        escrowCompany: escrow.company || "TBD",
        listPrice: transaction.purchasePrice.trim(),
        metadata,
        documents: existingProject?.documents ?? documents,
        tasks: existingProject?.tasks ?? [],
        emails: existingProject?.emails ?? [],
        deadlines: existingProject?.deadlines ?? [],
        attachments: existingProject?.attachments ?? [],
        fileFolders: existingProject?.fileFolders ?? [],
      });
      toast.success("Transaction updated!");
      navigate(`/projects/${id}`);
      return;
    }

    const created = addProject({
      name: `${property.address} — ${linkedClient?.name?.split(" ").slice(-1)[0] || "New"} ${type === "Listing" ? "Listing" : "Buyer"}`,
      clientId: clientId.trim(),
      clientName: linkedClient?.name || "Unassigned",
      propertyAddress: fullAddress || property.address,
      type: type as unknown as ProjectType,
      stage: initialStage,
      nextStep: nextStep.trim(),
      nextStepDate: nextStepDate || "",
      yearBuilt: property.yearBuilt,
      propertyType: property.propertyType,
      representationSide: type === "Listing" ? "Seller" : "Buyer",
      escrowOfficer: escrow.name || "TBD",
      escrowCompany: escrow.company || "TBD",
      listPrice: transaction.purchasePrice.trim(),
      metadata,
      documents,
    });

    toast.success("Transaction created!", {
      description: `${type} for ${property.address} · ${documents.length} docs auto-loaded from rules`,
    });
    navigate(`/projects/${created.id}`);
  };

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-[1500px] flex-1 flex-col overflow-hidden px-4 py-6 md:px-6 md:py-8 xl:px-8">
      <div className="shrink-0">
      <button onClick={() => navigate("/projects")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Transactions
      </button>
      <PageHeader
        title={isEditMode ? "Update Transaction" : "New Transaction"}
        subtitle={isEditMode ? "Edit this transaction using the same project form." : "Set up a new Listing or Buyer File transaction."}
      />
      {isEditMode && loadingEditProject ? (
        <div className="mb-4 rounded-md border border-border bg-secondary/20 p-3 text-sm text-muted-foreground">
          Loading transaction details...
        </div>
      ) : null}

      <div className="mb-4 rounded-lg border border-border bg-card p-2">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
          {stepOrder.map((step, idx) => {
            const active = currentStep === step;
            return (
              <button
                key={step}
                type="button"
                onClick={() => setCurrentStep(step)}
                className={`rounded-md border px-3 py-2 text-left transition-colors ${
                  active ? "border-accent bg-accent/10 text-foreground" : "border-border bg-background text-muted-foreground hover:border-accent/50"
                }`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide">Step {idx + 1}</p>
                <p className="text-xs font-medium">{stepTitle[step]}</p>
              </button>
            );
          })}
        </div>
      </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-12 gap-4 xl:gap-6 pb-4">
        <div className="xl:col-span-8 2xl:col-span-9 space-y-4">
          {/* General */}
          <Section title="General" tone="core" visible={currentStep === "core"} open={open.general} onToggle={() => toggle("general")}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Next Step *" invalid={showFieldError("next-step")}>
                <Input
                  value={nextStep}
                  onChange={e => setNextStep(e.target.value)}
                  placeholder="e.g. Send disclosure packet to seller"
                  required
                  aria-invalid={showFieldError("next-step")}
                />
              </Field>
              <Field label="Next Step Date">
                <Input type="date" value={nextStepDate} onChange={e => setNextStepDate(e.target.value)} />
              </Field>
            </div>
          </Section>

          {/* Transaction Details */}
          <Section title="Transaction Details" tone="financial" visible={currentStep === "core"} open={open.transaction} onToggle={() => toggle("transaction")}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Purchase Price ($) *" invalid={showFieldError("price")}>
                <Input
                  value={transaction.purchasePrice}
                  onChange={e => setTransaction(p => ({ ...p, purchasePrice: sanitizeDecimal(e.target.value) }))}
                  placeholder="$1,250,000"
                  required
                  aria-invalid={showFieldError("price")}
                />
              </Field>
              <YesNoField
                label="DocuSign?"
                labelHelp={TX_FIELD_HELP.docuSign}
                value={transaction.docuSign}
                onChange={(v) => setTransaction(p => ({ ...p, docuSign: v }))}
              />
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
              <Field label="SPBB %" labelHelp={TX_FIELD_HELP.spbbPct}>
                <Input value={transaction.spbbPct} onChange={e => setTransaction(p => ({ ...p, spbbPct: sanitizePercent(e.target.value) }))} placeholder="2.5%" />
              </Field>
              <YesNoField
                label="FTC?"
                labelHelp={TX_FIELD_HELP.ftc}
                value={transaction.ftc}
                onChange={(v) => setTransaction(p => ({ ...p, ftc: v }))}
              />
              {transaction.ftc === "yes" && (
                <>
                  <Field label="FTC Amount ($)" labelHelp={TX_FIELD_HELP.ftcAmount}>
                    <Input value={transaction.ftcAmount} onChange={e => setTransaction(p => ({ ...p, ftcAmount: sanitizeDecimal(e.target.value) }))} placeholder="$5,000" />
                  </Field>
                  <Field label="FTC Paid By" labelHelp={TX_FIELD_HELP.ftcPaidBy}>
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
              <Field label="RPA Seller" labelHelp={TX_FIELD_HELP.rpaSeller} hint="Optional. Seller name/vesting exactly as shown on the RPA.">
                <Input
                  value={transaction.rpaSeller}
                  onChange={e => setTransaction(p => ({ ...p, rpaSeller: e.target.value }))}
                  placeholder="e.g. John Smith and Jane Smith, Trustees..."
                />
              </Field>
              <Field label="Prelim Seller" labelHelp={TX_FIELD_HELP.prelimSeller} hint="Optional. Seller name/vesting exactly as shown on the Preliminary Title Report.">
                <Input
                  value={transaction.prelimSeller}
                  onChange={e => setTransaction(p => ({ ...p, prelimSeller: e.target.value }))}
                  placeholder="e.g. John A Smith and Jane B Smith, Trustees..."
                />
              </Field>
              <Field
                label="Seller Name Match?"
                labelHelp={TX_FIELD_HELP.sellerNameMatch}
                className="md:col-span-2"
                hint={autoSellerNameMatch
                  ? "Auto-calculated from both names. You can override if needed."
                  : "Pending until both RPA Seller and Prelim Seller are filled."}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={transaction.sellerMatchOverride || "__auto__"}
                    onValueChange={(v) => setTransaction((p) => ({ ...p, sellerMatchOverride: v === "__auto__" ? "" : (v as YesNo) }))}
                  >
                    <SelectTrigger className="w-[220px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__auto__">
                        Auto ({autoSellerNameMatch === "yes" ? "Yes" : autoSellerNameMatch === "no" ? "No" : "Pending"})
                      </SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">
                    Effective status: {sellerNameMatchStatus === "yes" ? "Yes" : sellerNameMatchStatus === "no" ? "No" : "Pending"}
                  </span>
                </div>
              </Field>
              {sellerNameMatchStatus === "no" && (
                <Field
                  label="Mismatch Notes"
                  className="md:col-span-2"
                  hint="Optional. Explain why names differ (trust text, vesting, spelling, etc.)."
                >
                  <Textarea
                    value={transaction.sellerMismatchNotes}
                    onChange={e => setTransaction(p => ({ ...p, sellerMismatchNotes: e.target.value }))}
                    rows={2}
                    placeholder="Reason for mismatch between RPA Seller and Prelim Seller..."
                  />
                </Field>
              )}
              <Field label="NHD Details (RPA)" labelHelp={TX_FIELD_HELP.nhdRpa} className="md:col-span-2">
                <Input value={transaction.nhdRpa} onChange={e => setTransaction(p => ({ ...p, nhdRpa: e.target.value }))} placeholder="Company, with/without environmental, who pays" />
              </Field>
              <Field label="Home Warranty"><Input value={transaction.homeWarranty} onChange={e => setTransaction(p => ({ ...p, homeWarranty: e.target.value }))} /></Field>
              <Field label="Escrow #" labelHelp={TX_FIELD_HELP.escrowNumber}>
                <Input value={transaction.escrowNumber} onChange={e => setTransaction(p => ({ ...p, escrowNumber: e.target.value }))} />
              </Field>
              <Field label="Transaction Notes" className="md:col-span-2">
                <Textarea value={transaction.notes} onChange={e => setTransaction(p => ({ ...p, notes: e.target.value }))} rows={3} />
              </Field>
            </div>
          </Section>

          {/* Property Information */}
          <Section title="Property Information" tone="property" visible={currentStep === "core"} open={open.property} onToggle={() => toggle("property")}>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <Field label="MLS #" labelHelp={TX_FIELD_HELP.mlsNumber} className="xl:col-span-1">
                <Input value={property.mlsNumber} onChange={e => setProperty(p => ({ ...p, mlsNumber: sanitizeDigits(e.target.value) }))} />
              </Field>
              <Field label="Property Type" className="xl:col-span-1">
                <Select value={property.propertyType} onValueChange={(v) => setProperty(p => ({ ...p, propertyType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["SFR", "Condo", "Vacant Land", "Townhouse", "Multi-Family", "Mobile/Manufactured Home", "Commercial", "Other"].map(o => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Property Address *" className="md:col-span-2 xl:col-span-2" invalid={showFieldError("address")}>
                <Input
                  value={property.address}
                  onChange={e => setProperty(p => ({ ...p, address: e.target.value }))}
                  required
                  aria-invalid={showFieldError("address")}
                />
              </Field>
              <Field label="City" className="xl:col-span-1"><Input value={property.city} onChange={e => setProperty(p => ({ ...p, city: e.target.value }))} /></Field>
              <Field label="State" className="xl:col-span-1"><Input value={property.state} onChange={e => setProperty(p => ({ ...p, state: e.target.value }))} /></Field>
              <Field label="ZIP" className="xl:col-span-1"><Input value={property.zip} onChange={e => setProperty(p => ({ ...p, zip: sanitizeDigits(e.target.value) }))} /></Field>
              <Field label="County" className="xl:col-span-1"><Input value={property.county} onChange={e => setProperty(p => ({ ...p, county: e.target.value }))} /></Field>
              <Field label="Year Built" className="xl:col-span-1"><Input value={property.yearBuilt} onChange={e => setProperty(p => ({ ...p, yearBuilt: sanitizeDigits(e.target.value) }))} /></Field>
              <Field label="Lot Size" className="xl:col-span-1"><Input value={property.lotSize} onChange={e => setProperty(p => ({ ...p, lotSize: sanitizeDecimal(e.target.value) }))} /></Field>
              <Field label="Square Feet (home)" className="xl:col-span-1"><Input value={property.squareFeet} onChange={e => setProperty(p => ({ ...p, squareFeet: sanitizeDigits(e.target.value) }))} /></Field>
              <Field label="Disclosure Link" labelHelp={TX_FIELD_HELP.disclosureLink} className="xl:col-span-2">
                <Input value={property.disclosureLink} onChange={e => setProperty(p => ({ ...p, disclosureLink: e.target.value }))} placeholder="https://..." />
              </Field>

              <YesNoField label="Exempt Seller?" labelHelp={TX_FIELD_HELP.exemptSeller} value={property.exemptSeller} onChange={(v) => setProperty(p => ({ ...p, exemptSeller: v }))} />
              <YesNoField label="Solar?" value={property.solar} onChange={(v) => setProperty(p => ({ ...p, solar: v }))} />
              <YesNoField label="Well?" value={property.well} onChange={(v) => setProperty(p => ({ ...p, well: v }))} />
              <YesNoField label="Septic?" value={property.septic} onChange={(v) => setProperty(p => ({ ...p, septic: v }))} />
              <YesNoField label="HOA?" labelHelp={TX_FIELD_HELP.hoa} value={property.hoa} onChange={(v) => setProperty(p => ({ ...p, hoa: v }))} />
              <YesNoField label="Tenant Occupied?" value={property.tenantOccupied} onChange={(v) => setProperty(p => ({ ...p, tenantOccupied: v }))} />
              {isListing && property.hoa === "yes" && (
                <Field label="HOA Order Details" labelHelp={TX_FIELD_HELP.hoaOrderDetails} className="md:col-span-2">
                  <Input value={property.hoaOrderDetails} onChange={e => setProperty(p => ({ ...p, hoaOrderDetails: e.target.value }))} placeholder="Listing files only — fill in details" />
                </Field>
              )}
            </div>
          </Section>

          {/* Listing Details (Listing only) */}
          {isListing && (
            <Section title="Listing Details" tone="listing" visible={currentStep === "listing"} open={open.listing} onToggle={() => toggle("listing")} subtitle="Listing files only">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Target OMD" labelHelp={TX_FIELD_HELP.targetOmd}>
                  <Input value={listing.targetOMD} onChange={e => setListing(p => ({ ...p, targetOMD: e.target.value }))} placeholder="Fill in the blank" />
                </Field>
                <Field label="Disclosure Timing" labelHelp={TX_FIELD_HELP.disclosureTiming}>
                  <Input value={listing.disclosureTiming} onChange={e => setListing(p => ({ ...p, disclosureTiming: e.target.value }))} placeholder="Fill in the blank" />
                </Field>
                <YesNoField
                  label="Questionnaires Electronically?"
                  labelHelp={TX_FIELD_HELP.questionnairesElectronically}
                  value={listing.questionnairesElectronically}
                  onChange={(v) => setListing(p => ({ ...p, questionnairesElectronically: v }))}
                />
                <YesNoField
                  label="DocuSign?"
                  labelHelp={TX_FIELD_HELP.docuSign}
                  value={listing.docuSign}
                  onChange={(v) => setListing(p => ({ ...p, docuSign: v }))}
                />
                <Field label="NHD Company" labelHelp={TX_FIELD_HELP.nhdCompany}>
                  <Input value={listing.nhdCompany} onChange={e => setListing(p => ({ ...p, nhdCompany: e.target.value }))} />
                </Field>
                <div className="flex items-end gap-2 rounded-md border border-border/70 bg-secondary/20 p-2.5">
                  <Checkbox id="env" checked={listing.nhdEnvironmental} onCheckedChange={(v) => setListing(p => ({ ...p, nhdEnvironmental: !!v }))} />
                  <div className="mb-2 flex items-center gap-1">
                    <Label htmlFor="env" className="cursor-pointer">
                      With Environmental
                    </Label>
                    <FieldLabelHelp help={TX_FIELD_HELP.nhdEnvironmental} label="With Environmental" />
                  </div>
                </div>
              </div>
            </Section>
          )}

          {/* Timeline */}
          <Section title="Timeline" tone="timeline" visible={currentStep === "timeline"} open={open.timeline} onToggle={() => toggle("timeline")}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
            <DateRow label="EMD to Escrow" labelHelp={TX_FIELD_HELP.emdToEscrow} value={timeline.emdToEscrow} onChange={v => setTimeline(p => ({ ...p, emdToEscrow: v }))} />
            <DateRow label="Estimated COE" labelHelp={TX_FIELD_HELP.estimatedCoe} value={timeline.estimatedCOE} onChange={v => setTimeline(p => ({ ...p, estimatedCOE: v }))} />
            <DateRow label="Seller Disclosures to Buyer" value={timeline.sellerDisclosuresToBuyer} onChange={v => setTimeline(p => ({ ...p, sellerDisclosuresToBuyer: v }))} />
            <DateRow label="Investigation Contingency Removal" value={timeline.investigationContingency} onChange={v => setTimeline(p => ({ ...p, investigationContingency: v }))} />
            <DateRow label="Insurance Contingency Removal" value={timeline.insuranceContingency} onChange={v => setTimeline(p => ({ ...p, insuranceContingency: v }))} />
            <DateRow label="Review of Seller Docs Contingency Removal" value={timeline.reviewSellerDocs} onChange={v => setTimeline(p => ({ ...p, reviewSellerDocs: v }))} />
            <DateRow label="Review of Prelim Contingency Removal" labelHelp={TX_FIELD_HELP.reviewPrelim} value={timeline.reviewPrelim} onChange={v => setTimeline(p => ({ ...p, reviewPrelim: v }))} />
            <DateRow
              label="Review of Comm Int Discl Contingency Removal"
              labelHelp={TX_FIELD_HELP.reviewCommIntDiscl}
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
                <DateRow label="COP — Into Contract" labelHelp={TX_FIELD_HELP.copIntoContract} value={cop.intoContract} onChange={v => setCop(p => ({ ...p, intoContract: v }))} />
                <DateRow label="COP — COE" labelHelp={TX_FIELD_HELP.copCoe} value={cop.coe} onChange={v => setCop(p => ({ ...p, coe: v }))} />
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
                <DateRow label="SPRP — Into Contract" labelHelp={TX_FIELD_HELP.sprpIntoContract} value={sprp.intoContract} onChange={v => setSprp(p => ({ ...p, intoContract: v }))} />
                <DateRow label="SPRP — COE" labelHelp={TX_FIELD_HELP.sprpCoe} value={sprp.coe} onChange={v => setSprp(p => ({ ...p, coe: v }))} />
              </div>
            )}
            </div>
          </Section>

          {currentStep === "review" && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Review Summary</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Final check before {isEditMode ? "updating" : "creating"} this transaction.
                  </p>
                </div>
                <div className={`text-xs font-semibold px-2 py-1 rounded ${
                  missingRequiredItems.length === 0
                    ? "bg-green-500/10 text-green-700 dark:text-green-400"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                }`}>
                  {missingRequiredItems.length === 0
                    ? "Ready to submit"
                    : `${missingRequiredItems.length} required field${missingRequiredItems.length > 1 ? "s" : ""} missing`}
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
                <div className="rounded-md border border-border/70 bg-secondary/20 p-3 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Transaction</p>
                  <ReviewItem label="Type" value={type} />
                  <ReviewItem label="Primary Contact" value={linkedPrimaryContact ? labelFromClient(linkedPrimaryContact) : "Not selected"} />
                  <ReviewItem label="Address" value={property.address || "Not set"} />
                  <ReviewItem label="Purchase Price" value={transaction.purchasePrice || "Not set"} />
                  <ReviewItem label="Loan Type" value={transaction.loanType} />
                </div>

                <div className="rounded-md border border-border/70 bg-secondary/20 p-3 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parties</p>
                  <ReviewItem label="Buyer's Agent" value={buyerAgents[0]?.name || "Not set"} />
                  <ReviewItem label="Listing Agent" value={listingAgents[0]?.name || "Not set"} />
                  <ReviewItem label="Escrow Officer" value={escrow.name || "Not set"} />
                  <ReviewItem label="Lender" value={lender.name || "Not set"} />
                  <ReviewItem label="Sellers" value={`${sellers.filter((s) => s.name || s.email).length}/${sellers.length}`} />
                  <ReviewItem label="Buyers" value={`${buyers.filter((b) => b.name || b.email).length}/${buyers.length}`} />
                </div>

                <div className="rounded-md border border-border/70 bg-secondary/20 p-3 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Timeline</p>
                  <ReviewItem label="Contract Date" value={timeline.contractDate || "Not set"} />
                  <ReviewItem label="Acceptance Date" value={timeline.acceptanceDate || "Not set"} />
                  <ReviewItem
                    label="Preapproval"
                    value={isAllCash ? "N/A — All Cash" : timeline.preapproval || "Not set"}
                  />
                  <ReviewItem label="EMD to Escrow" value={timeline.emdToEscrow || "Not set"} />
                  <ReviewItem label="Estimated COE" value={timeline.estimatedCOE || "Not set"} />
                  <ReviewItem
                    label="Loan Contingency"
                    value={isAllCash ? "N/A — All Cash" : timeline.loanContingency || "Not set"}
                  />
                </div>
              </div>

              {missingRequiredItems.length > 0 && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2">Missing required fields</p>
                  <div className="flex flex-wrap gap-2">
                    {missingRequiredItems.map((item) => (
                      <Button
                        key={item.key}
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setCurrentStep(item.step)}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Parties */}
          <Section title="Parties" tone="parties" visible={currentStep === "parties"} open={open.parties} onToggle={() => toggle("parties")}>
          <div className="space-y-6">
            <PartyGroup title="Buyer's Agent">
              <div className="mb-3">
                <Label className="text-xs text-muted-foreground">Saved contact</Label>
                <ContactLinkPicker
                  variant="party"
                  defaultCreateRole="Buyer's Agent"
                  partyPlaceholder="Link buyer's agent…"
                  value={buyerAgents[0]?.contactId ?? ""}
                  options={clientOptions}
                  onValueChange={(cid) => {
                    const opts = mergePartyClientOptions();
                    setBuyerAgents((prev) => [
                      applyAgentContact(prev[0] ?? blankAgent(), cid, opts),
                      ...prev.slice(1),
                    ]);
                  }}
                />
              </div>
              <AgentForm value={buyerAgents[0]} onChange={a => setBuyerAgents([a, ...buyerAgents.slice(1)])} />
            </PartyGroup>
            {showBuyerAgent2 ? (
              <PartyGroup
                title="Buyer's Agent 2 (optional)"
                action={(
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowBuyerAgent2(false);
                      setBuyerAgents((prev) => {
                        const next = [...prev];
                        next[1] = blankAgent();
                        return next;
                      });
                    }}
                  >
                    Remove
                  </Button>
                )}
              >
                <div className="mb-3">
                  <Label className="text-xs text-muted-foreground">Saved contact</Label>
                  <ContactLinkPicker
                    variant="party"
                    defaultCreateRole="Buyer's Agent"
                    partyPlaceholder="Link buyer's agent 2…"
                    value={buyerAgents[1]?.contactId ?? ""}
                    options={clientOptions}
                    onValueChange={(cid) => {
                      const opts = mergePartyClientOptions();
                      setBuyerAgents((prev) => {
                        const next = [...prev];
                        const base = next[1] ?? blankAgent();
                        next[1] = applyAgentContact(base, cid, opts);
                        return next;
                      });
                    }}
                  />
                </div>
                <AgentForm value={buyerAgents[1] || blankAgent()} onChange={a => {
                  const next = [...buyerAgents]; next[1] = a; setBuyerAgents(next);
                }} />
              </PartyGroup>
            ) : (
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setShowBuyerAgent2(true)}>
                <Plus className="w-3 h-3" /> Add Buyer's Agent 2
              </Button>
            )}
            {!additionalBuyerAgent ? (
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setAdditionalBuyerAgent(true)}>
                <Plus className="w-3 h-3" /> Add Additional Buyer's Agent
              </Button>
            ) : (
              <div className="flex justify-end">
                <Button type="button" size="sm" variant="ghost" onClick={() => setAdditionalBuyerAgent(false)}>
                  Remove Additional Buyer's Agent
                </Button>
              </div>
            )}
            {additionalBuyerAgent && (
              <PartyGroup title="Additional Buyer's Agent">
                <div className="mb-3">
                  <Label className="text-xs text-muted-foreground">Saved contact</Label>
                  <ContactLinkPicker
                    variant="party"
                    defaultCreateRole="Buyer's Agent"
                    partyPlaceholder="Link additional buyer's agent…"
                    value={buyerAgent3.contactId ?? ""}
                    options={clientOptions}
                    onValueChange={(cid) => {
                      const opts = mergePartyClientOptions();
                      setBuyerAgent3((prev) => applyAgentContact(prev, cid, opts));
                    }}
                  />
                </div>
                <AgentForm value={buyerAgent3} onChange={setBuyerAgent3} />
              </PartyGroup>
            )}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <PartyGroup title="Buyer's Agent's TC">
                <div className="mb-3">
                  <Label className="text-xs text-muted-foreground">Saved contact</Label>
                  <ContactLinkPicker
                    variant="party"
                    defaultCreateRole="Buyer's Agent's TC"
                    partyPlaceholder="Link TC contact…"
                    value={buyerAgentTC.contactId ?? ""}
                    options={clientOptions}
                    onValueChange={(cid) => {
                      const opts = mergePartyClientOptions();
                      setBuyerAgentTC((prev) => applySimpleContact(prev, cid, opts));
                    }}
                  />
                </div>
                <SimpleForm value={buyerAgentTC} onChange={setBuyerAgentTC} />
              </PartyGroup>
              <PartyGroup title="Buyer's Agent's Assistant">
                <div className="mb-3">
                  <Label className="text-xs text-muted-foreground">Saved contact</Label>
                  <ContactLinkPicker
                    variant="party"
                    defaultCreateRole="Buyer's Agent's Assistant"
                    partyPlaceholder="Link assistant contact…"
                    value={buyerAgentAssistant.contactId ?? ""}
                    options={clientOptions}
                    onValueChange={(cid) => {
                      const opts = mergePartyClientOptions();
                      setBuyerAgentAssistant((prev) => applySimpleContact(prev, cid, opts));
                    }}
                  />
                </div>
                <SimpleForm value={buyerAgentAssistant} onChange={setBuyerAgentAssistant} />
              </PartyGroup>
            </div>

            <PartyGroup title="Listing Agent">
              <div className="mb-3">
                <Label className="text-xs text-muted-foreground">Saved contact</Label>
                <ContactLinkPicker
                  variant="party"
                  defaultCreateRole="Listing Agent"
                  partyPlaceholder="Link listing agent…"
                  value={listingAgents[0]?.contactId ?? ""}
                  options={clientOptions}
                  onValueChange={(cid) => {
                    const opts = mergePartyClientOptions();
                    setListingAgents((prev) => [
                      applyAgentContact(prev[0] ?? blankAgent(), cid, opts),
                      ...prev.slice(1),
                    ]);
                  }}
                />
              </div>
              <AgentForm value={listingAgents[0]} onChange={a => setListingAgents([a, ...listingAgents.slice(1)])} />
            </PartyGroup>
            {showListingAgent2 ? (
              <PartyGroup
                title="Listing Agent 2 (optional)"
                action={(
                  <Button type="button" size="sm" variant="ghost" onClick={() => setShowListingAgent2(false)}>
                    Remove
                  </Button>
                )}
              >
                <div className="mb-3">
                  <Label className="text-xs text-muted-foreground">Saved contact</Label>
                  <ContactLinkPicker
                    variant="party"
                    defaultCreateRole="Listing Agent"
                    partyPlaceholder="Link listing agent 2…"
                    value={listingAgents[1]?.contactId ?? ""}
                    options={clientOptions}
                    onValueChange={(cid) => {
                      const opts = mergePartyClientOptions();
                      setListingAgents((prev) => {
                        const next = [...prev];
                        const base = next[1] ?? blankAgent();
                        next[1] = applyAgentContact(base, cid, opts);
                        return next;
                      });
                    }}
                  />
                </div>
                <AgentForm value={listingAgents[1] || blankAgent()} onChange={a => {
                  const next = [...listingAgents]; next[1] = a; setListingAgents(next);
                }} />
              </PartyGroup>
            ) : (
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setShowListingAgent2(true)}>
                <Plus className="w-3 h-3" /> Add Listing Agent 2
              </Button>
            )}
            {!additionalListingAgent ? (
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setAdditionalListingAgent(true)}>
                <Plus className="w-3 h-3" /> Add Additional Listing Agent
              </Button>
            ) : (
              <div className="flex justify-end">
                <Button type="button" size="sm" variant="ghost" onClick={() => setAdditionalListingAgent(false)}>
                  Remove Additional Listing Agent
                </Button>
              </div>
            )}
            {additionalListingAgent && (
              <PartyGroup title="Additional Listing Agent">
                <div className="mb-3">
                  <Label className="text-xs text-muted-foreground">Saved contact</Label>
                  <ContactLinkPicker
                    variant="party"
                    defaultCreateRole="Listing Agent"
                    partyPlaceholder="Link additional listing agent…"
                    value={listingAgent3.contactId ?? ""}
                    options={clientOptions}
                    onValueChange={(cid) => {
                      const opts = mergePartyClientOptions();
                      setListingAgent3((prev) => applyAgentContact(prev, cid, opts));
                    }}
                  />
                </div>
                <AgentForm value={listingAgent3} onChange={setListingAgent3} />
              </PartyGroup>
            )}
            <PartyGroup title="Listing Agent's TC">
              <div className="mb-3">
                <Label className="text-xs text-muted-foreground">Saved contact</Label>
                <ContactLinkPicker
                  variant="party"
                  defaultCreateRole="Listing Agent's TC"
                  partyPlaceholder="Link listing TC contact…"
                  value={listingAgentTC.contactId ?? ""}
                  options={clientOptions}
                  onValueChange={(cid) => {
                    const opts = mergePartyClientOptions();
                    setListingAgentTC((prev) => applySimpleContact(prev, cid, opts));
                  }}
                />
              </div>
              <SimpleForm value={listingAgentTC} onChange={setListingAgentTC} />
            </PartyGroup>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <PartyGroup title="Escrow Officer">
              <div className="mb-3">
                <Label className="text-xs text-muted-foreground">Saved contact</Label>
                <ContactLinkPicker
                  variant="party"
                  defaultCreateRole="Escrow Officer"
                  partyPlaceholder="Link escrow officer…"
                  value={escrow.contactId ?? ""}
                  options={clientOptions}
                  onValueChange={(cid) => {
                    const opts = mergePartyClientOptions();
                    setEscrow((prev) => applyEscrowContact(prev, cid, opts));
                  }}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Name"><Input value={escrow.name} onChange={e => setEscrow({ ...escrow, name: e.target.value })} /></Field>
                <Field label="Email"><Input type="email" value={escrow.email} onChange={e => setEscrow({ ...escrow, email: e.target.value })} /></Field>
                <Field label="Phone"><Input value={escrow.phone} onChange={e => setEscrow({ ...escrow, phone: sanitizeDigits(e.target.value) })} /></Field>
                <Field label="Company"><Input value={escrow.company} onChange={e => setEscrow({ ...escrow, company: e.target.value })} /></Field>
                <Field label="Address" className="md:col-span-2"><Input value={escrow.address} onChange={e => setEscrow({ ...escrow, address: e.target.value })} /></Field>
                <Field label="City, State, Zip" className="md:col-span-2"><Input value={escrow.cityStateZip} onChange={e => setEscrow({ ...escrow, cityStateZip: e.target.value })} /></Field>
              </div>
            </PartyGroup>
            <PartyGroup title="Escrow Assistant">
              <div className="mb-3">
                <Label className="text-xs text-muted-foreground">Saved contact</Label>
                <ContactLinkPicker
                  variant="party"
                  defaultCreateRole="Escrow Assistant"
                  partyPlaceholder="Link escrow assistant…"
                  value={escrowAssistant.contactId ?? ""}
                  options={clientOptions}
                  onValueChange={(cid) => {
                    const opts = mergePartyClientOptions();
                    setEscrowAssistant((prev) => applySimpleContact(prev, cid, opts));
                  }}
                />
              </div>
              <SimpleForm value={escrowAssistant} onChange={setEscrowAssistant} />
            </PartyGroup>
            </div>

            <PartyGroup title="Lender">
              <div className="mb-3">
                <Label className="text-xs text-muted-foreground">Saved contact</Label>
                <ContactLinkPicker
                  variant="party"
                  defaultCreateRole="Lender"
                  partyPlaceholder="Link lender contact…"
                  value={lender.contactId ?? ""}
                  options={clientOptions}
                  onValueChange={(cid) => {
                    const opts = mergePartyClientOptions();
                    setLender((prev) => applyLenderContact(prev, cid, opts));
                  }}
                />
              </div>
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
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
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
                    <div className="mb-3">
                      <Label className="text-xs text-muted-foreground">Saved contact</Label>
                      <ContactLinkPicker
                        variant="party"
                        defaultCreateRole="Seller"
                        partyPlaceholder="Link seller contact…"
                        value={s.contactId ?? ""}
                        options={clientOptions}
                        onValueChange={(cid) => {
                          const opts = mergePartyClientOptions();
                          setSellers((prev) => {
                            const next = [...prev];
                            next[i] = applyPersonContact(next[i] ?? blankPerson(), cid, opts);
                            return next;
                          });
                        }}
                      />
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
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
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
                    <div className="mb-3">
                      <Label className="text-xs text-muted-foreground">Saved contact</Label>
                      <ContactLinkPicker
                        variant="party"
                        defaultCreateRole="Buyer"
                        partyPlaceholder="Link buyer contact…"
                        value={b.contactId ?? ""}
                        options={clientOptions}
                        onValueChange={(cid) => {
                          const opts = mergePartyClientOptions();
                          setBuyers((prev) => {
                            const next = [...prev];
                            next[i] = applyPersonContact(next[i] ?? blankPerson(), cid, opts);
                            return next;
                          });
                        }}
                      />
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
        </div>

        <div className="xl:col-span-4 2xl:col-span-3 space-y-4 xl:sticky xl:top-4 self-start">
          <div className="bg-card border border-border rounded-lg p-4 space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Transaction Type *</Label>
              <RadioGroup value={type} onValueChange={(v) => setType(v as TxType)} className="grid grid-cols-1 gap-2">
                {(["Listing", "Buyer File"] as TxType[]).map(t => (
                  <label
                    key={t}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      type === t ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
                    }`}
                  >
                    <RadioGroupItem value={t} id={`type-${t}`} />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t}</p>
                      <p className="text-xs text-muted-foreground">
                        {t === "Listing" ? "Seller-side file" : "Buyer-side file"}
                      </p>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div
              className={`space-y-2 rounded-md border p-2 ${
                showFieldError("contact") ? "border-destructive/60 bg-destructive/5" : "border-transparent"
              }`}
            >
              <Label className="text-sm font-semibold">Primary Contact *</Label>
              <PrimaryContactPicker value={clientId} options={clientOptions} onValueChange={onClientChange} />
              {showFieldError("contact") ? (
                <p className="text-xs text-destructive">Select a primary contact before saving.</p>
              ) : null}
            </div>

            <div className="pt-2 border-t border-border space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Mode</span>
                <span className="font-medium text-foreground">{isEditMode ? "Update" : "Create"}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Completion</span>
                <span className="font-medium text-foreground">{requiredDone}/{requiredTotal}</span>
              </div>
              <div className="h-2 w-full rounded bg-secondary/60 overflow-hidden">
                <div
                  className="h-full bg-accent transition-all"
                  style={{ width: `${Math.round((requiredDone / requiredTotal) * 100)}%` }}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-border space-y-2">
              <p className="text-xs font-semibold text-foreground">Quick navigation</p>
              <div className="grid grid-cols-1 gap-1">
                {stepOrder.map((step) => (
                  <button
                    key={`jump-${step}`}
                    type="button"
                    onClick={() => setCurrentStep(step)}
                    className={`text-left rounded px-2 py-1 text-xs transition-colors ${
                      currentStep === step ? "bg-accent/10 text-foreground" : "text-muted-foreground hover:bg-secondary/50"
                    }`}
                  >
                    {stepTitle[step]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-sky-300/90 bg-sky-50/40 hover:bg-sky-100/60 hover:border-sky-400 text-sky-900 disabled:opacity-50"
                disabled={stepOrder.indexOf(currentStep) === 0}
                onClick={() => setCurrentStep(stepOrder[Math.max(0, stepOrder.indexOf(currentStep) - 1)])}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-violet-300/90 bg-violet-50/40 hover:bg-violet-100/60 hover:border-violet-400 text-violet-900 disabled:opacity-50"
                disabled={stepOrder.indexOf(currentStep) === stepOrder.length - 1}
                onClick={() => setCurrentStep(stepOrder[Math.min(stepOrder.length - 1, stepOrder.indexOf(currentStep) + 1)])}
              >
                Next
              </Button>
            </div>
            <Button
              type="submit"
              className="w-full border border-primary/80 shadow-sm shadow-primary/20 disabled:opacity-50"
              disabled={!formCanSubmit || (isEditMode && loadingEditProject)}
              title={
                !formCanSubmit && missingRequiredItems.length > 0
                  ? `Required: ${missingRequiredItems.map((item) => item.label).join(", ")}`
                  : !formCanSubmit
                    ? "Fix validation errors before saving"
                    : undefined
              }
            >
              {isEditMode ? "Update Transaction" : "Create Transaction"}
            </Button>
            {!formCanSubmit && missingRequiredItems.length > 0 ? (
              <p className="text-xs text-muted-foreground text-center">
                Complete {missingRequiredItems.map((item) => item.label).join(", ")} to save.
              </p>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="w-full border-rose-300/90 bg-rose-50/40 hover:bg-rose-100/60 hover:border-rose-400 text-rose-900"
              onClick={() => navigate("/projects")}
            >
              Cancel
            </Button>
          </div>
        </div>
      </form>
      </div>
    </div>
  );
}

/* ---------- Reusable building blocks ---------- */

function Section({
  title, subtitle, open, onToggle, children, tone = "default", visible = true,
}: {
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  tone?: "default" | "core" | "financial" | "property" | "timeline" | "parties" | "listing";
  visible?: boolean;
}) {
  if (!visible) return null;
  const toneStyles: Record<NonNullable<typeof tone>, string> = {
    default: "border-border",
    core: "border-l-4 border-l-sky-500",
    financial: "border-l-4 border-l-amber-500",
    property: "border-l-4 border-l-teal-500",
    timeline: "border-l-4 border-l-violet-500",
    parties: "border-l-4 border-l-rose-500",
    listing: "border-l-4 border-l-indigo-500",
  };
  const toneHeaderStyles: Record<NonNullable<typeof tone>, string> = {
    default: "bg-secondary/20",
    core: "bg-sky-500/10",
    financial: "bg-amber-500/10",
    property: "bg-teal-500/10",
    timeline: "bg-violet-500/10",
    parties: "bg-rose-500/10",
    listing: "bg-indigo-500/10",
  };
  return (
    <div className={`bg-card border rounded-lg overflow-hidden ${toneStyles[tone]}`}>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-4 py-3 transition-colors text-left ${toneHeaderStyles[tone]} hover:brightness-95`}
      >
        <div>
          <h3 className="font-display font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-4 pt-2 border-t border-border bg-background/60">{children}</div>}
    </div>
  );
}

function FieldLabelRow({ label, labelHelp }: { label: string; labelHelp?: TransactionFieldHelp }) {
  return (
    <div className="flex items-center gap-1">
      <Label className="text-xs font-semibold text-foreground/90">{label}</Label>
      {labelHelp ? <FieldLabelHelp help={labelHelp} label={label} /> : null}
    </div>
  );
}

function Field({
  label,
  hint,
  labelHelp,
  children,
  className = "",
  invalid = false,
}: {
  label: string;
  hint?: string;
  labelHelp?: TransactionFieldHelp;
  children: React.ReactNode;
  className?: string;
  invalid?: boolean;
}) {
  return (
    <div
      className={`space-y-1.5 rounded-md border p-2.5 ${
        invalid ? "border-destructive/60 bg-destructive/5" : "border-border/70 bg-secondary/20"
      } ${className}`}
    >
      <FieldLabelRow label={label} labelHelp={labelHelp} />
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function DateRow({
  label,
  value,
  onChange,
  disabled,
  disabledHint,
  labelHelp,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  disabledHint?: string;
  labelHelp?: TransactionFieldHelp;
}) {
  return (
    <div className="space-y-1.5 rounded-md border border-border/70 bg-secondary/20 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <FieldLabelRow label={label} labelHelp={labelHelp} />
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

function YesNoField({
  label,
  value,
  onChange,
  labelHelp,
}: {
  label: string;
  value: "yes" | "no" | "";
  onChange: (v: "yes" | "no") => void;
  labelHelp?: TransactionFieldHelp;
}) {
  return (
    <div className="space-y-1.5 rounded-md border border-border/70 bg-secondary/20 p-2.5">
      <FieldLabelRow label={label} labelHelp={labelHelp} />
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
    <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

function AgentForm({ value, onChange }: { value: AgentParty; onChange: (v: AgentParty) => void }) {
  const set = (k: keyof AgentParty, v: string) => onChange({ ...value, [k]: v });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Field label="Name"><Input value={value.name} onChange={e => set("name", e.target.value)} /></Field>
      <Field label="Email"><Input type="email" value={value.email} onChange={e => set("email", e.target.value)} /></Field>
      <Field label="Phone"><Input value={value.phone} onChange={e => set("phone", sanitizeDigits(e.target.value))} /></Field>
      <Field label="License Number"><Input value={value.licenseNumber} onChange={e => set("licenseNumber", sanitizeDigits(e.target.value))} /></Field>
      <Field label="Brokerage"><Input value={value.brokerage} onChange={e => set("brokerage", e.target.value)} /></Field>
      <Field label="Brokerage License Number"><Input value={value.brokerageLicense} onChange={e => set("brokerageLicense", sanitizeDigits(e.target.value))} /></Field>
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
