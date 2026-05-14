import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Edit, Trash2, Save, X, ToggleLeft, ToggleRight, GripVertical, Layers, Filter, Sparkles } from "lucide-react";
import {
  createDocumentRuleApi,
  deleteDocumentRuleApi,
  listDocumentRulesFromApi,
  patchDocumentRuleIsActiveApi,
  updateDocumentRuleApi,
} from "@/api/documentRules";
import { listProjectStoredFiles } from "@/api/storedFiles";
import { getApiBaseUrl } from "@/lib/apiConfig";
import {
  CRM_DOCUMENT_VAULT_PROJECT_ID,
  conditionalFormattingRules,
  type ConditionalFormattingRule,
  type DocumentRule,
  type FileAttachment,
  type RuleDocumentAction,
  type RuleTrigger,
  type RuleTriggerField,
  type RuleAction,
  type RuleKind,
} from "@/data/mockData";
import { useAppStore } from "@/store/appStore";
import DocumentNameSlotCombobox from "@/components/settings/DocumentNameSlotCombobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";

const triggerFieldOptions: { value: RuleTriggerField; label: string; values: string[] }[] = [
  { value: "transactionType", label: "Transaction Type", values: ["Listing", "Buyer File"] },
  { value: "propertyType", label: "Property Type", values: ["SFR", "Condo", "Vacant Land", "Townhouse", "Multi-Family", "Mobile/Manufactured Home", "Commercial", "Other"] },
  { value: "exemptSeller", label: "Exempt Seller", values: ["Yes", "No"] },
  { value: "hoa", label: "HOA", values: ["Yes", "No"] },
  { value: "tenantOccupied", label: "Tenant Occupied", values: ["Yes", "No"] },
  { value: "county", label: "County", values: ["Marin", "Sonoma", "Napa", "San Francisco", "Other"] },
  { value: "dualAgency", label: "Dual Agency", values: ["Yes", "No"] },
  { value: "financing", label: "Financing", values: ["All Cash", "Conventional", "FHA", "VA", "FHA/VA", "Other"] },
];

const actionLabels: Record<RuleAction, string> = {
  "add-required": "Add as Required",
  "add-optional": "Add as Optional",
  "mark-na": "Mark as N/A",
};

const actionStyles: Record<RuleAction, string> = {
  "add-required": "bg-primary/10 text-primary",
  "add-optional": "bg-secondary text-secondary-foreground",
  "mark-na": "bg-destructive/10 text-destructive",
};

const fieldLabel = (f: RuleTriggerField) => triggerFieldOptions.find(o => o.value === f)?.label ?? f;

function triggerFieldsUnique(triggers: RuleTrigger[]): string | null {
  const seen = new Set<RuleTriggerField>();
  for (const t of triggers) {
    if (seen.has(t.field)) {
      return `Trigger field "${fieldLabel(t.field)}" appears more than once. Each field can only be used once (conditions are combined with AND).`;
    }
    seen.add(t.field);
  }
  return null;
}

function duplicateStoredFileIds(ids: (string | undefined)[]): string | null {
  const present = ids.filter((id): id is string => Boolean(id));
  const seen = new Set<string>();
  for (const id of present) {
    if (seen.has(id)) return "The same CRM library file cannot be added on more than one row. Remove the duplicate or pick another file.";
    seen.add(id);
  }
  return null;
}

interface FormState {
  name: string;
  kind: RuleKind;
  /** Rule on/off; persisted as `is_active` on `conditional_rules` (no separate status column). */
  isActive: boolean;
  triggers: RuleTrigger[];
  documents: DocumentRule[];
  actions: RuleDocumentAction[];
}

const newDocSlot = (): DocumentRule => ({
  id: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  name: "",
  required: true,
});

const newActionSlot = (): RuleDocumentAction => ({
  id: `aslot-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  documentName: "",
  action: "add-required",
});

const blankForm = (kind: RuleKind = "conditional"): FormState => ({
  name: "",
  kind,
  isActive: true,
  triggers: [{ field: "transactionType", value: "Listing" }],
  documents: kind === "standard" ? [newDocSlot()] : [],
  actions: kind === "conditional" ? [newActionSlot()] : [],
});

export default function FormattingRulesTab() {
  const canManageRules = useAuthStore(
    (s) =>
      s.user?.role === "super_admin" ||
      Boolean(s.user?.permissions?.includes("document_rules.create")) ||
      Boolean(s.user?.permissions?.includes("document_rules.edit")) ||
      Boolean(s.user?.permissions?.includes("document_rules.delete")) ||
      Boolean(s.user?.permissions?.includes("document_rules.toggle_active"))
  );
  const crmVaultAttachments = useAppStore(
    (s) => s.projects.find((p) => p.id === CRM_DOCUMENT_VAULT_PROJECT_ID)?.attachments ?? []
  );

  const [rules, setRules] = useState<ConditionalFormattingRule[]>([]);
  const [rulesLoadState, setRulesLoadState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [vaultFiles, setVaultFiles] = useState<FileAttachment[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingRule, setEditingRule] = useState<ConditionalFormattingRule | null>(null);
  const [form, setForm] = useState<FormState>(blankForm());
  const [filter, setFilter] = useState<"all" | "standard" | "conditional">("all");
  const [savingRule, setSavingRule] = useState(false);
  const [rulesLoadError, setRulesLoadError] = useState<string | null>(null);

  const filtered = useMemo(
    () => rules.filter(r => filter === "all" || r.kind === filter),
    [rules, filter],
  );

  const refreshRulesFromApi = useCallback(async () => {
    const base = getApiBaseUrl();
    if (!base) {
      setRules(conditionalFormattingRules);
      setRulesLoadState("ok");
      setRulesLoadError(null);
      toast.message("API not configured", {
        description: "Showing built-in sample rules. Set VITE_API_URL to load and save document rules.",
      });
      return;
    }
    setRulesLoadState("loading");
    setRulesLoadError(null);
    try {
      const loaded = await listDocumentRulesFromApi();
      setRules(loaded);
      setRulesLoadState("ok");
      if (loaded.length === 0) {
        toast.message("No document rules in database", {
          description: "In backend/: npm run db:migrate && npm run db:seed:document-rules",
        });
      }
    } catch (e) {
      setRules([]);
      setRulesLoadState("error");
      const msg = e instanceof Error ? e.message : String(e);
      setRulesLoadError(msg);
      toast.error("Could not load document rules", { description: msg });
    }
  }, []);

  useEffect(() => {
    void refreshRulesFromApi();
  }, [refreshRulesFromApi]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (getApiBaseUrl()) {
        try {
          const { attachments } = await listProjectStoredFiles(CRM_DOCUMENT_VAULT_PROJECT_ID);
          if (!cancelled) setVaultFiles(attachments);
        } catch {
          if (!cancelled) setVaultFiles(crmVaultAttachments);
        }
      } else if (!cancelled) {
        setVaultFiles(crmVaultAttachments);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [crmVaultAttachments]);

  const openCreate = (kind: RuleKind) => {
    setForm(blankForm(kind));
    setEditingRule(null);
    setShowCreate(true);
  };

  const openEdit = (rule: ConditionalFormattingRule) => {
    const docs =
      rule.kind === "standard"
        ? rule.documents.length > 0
          ? [...rule.documents]
          : [newDocSlot()]
        : [];
    const acts =
      rule.kind === "conditional"
        ? rule.actions.length > 0
          ? [...rule.actions]
          : [newActionSlot()]
        : [];
    setForm({
      name: rule.name,
      kind: rule.kind,
      isActive: rule.isActive,
      triggers: rule.triggers.length ? [...rule.triggers] : [{ field: "transactionType", value: "Listing" }],
      documents: docs,
      actions: acts,
    });
    setEditingRule(rule);
    setShowCreate(true);
  };

  const updateTrigger = (idx: number, patch: Partial<RuleTrigger>) => {
    setForm(p => ({
      ...p,
      triggers: p.triggers.map((t, i) => (i === idx ? { ...t, ...patch } : t)),
    }));
  };
  const addTrigger = () =>
    setForm((p) => ({
      ...p,
      triggers: [
        ...p.triggers,
        {
          field: "propertyType",
          value: triggerFieldOptions.find((o) => o.value === "propertyType")?.values[0] ?? "SFR",
        },
      ],
    }));
  const removeTrigger = (idx: number) => setForm(p => ({ ...p, triggers: p.triggers.filter((_, i) => i !== idx) }));

  const updateDocument = (id: string, patch: Partial<DocumentRule>) => {
    setForm((p) => ({
      ...p,
      documents: p.documents.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    }));
  };

  const addDocumentRow = () => setForm((p) => ({ ...p, documents: [...p.documents, newDocSlot()] }));

  const removeDocument = (id: string) => {
    setForm((p) => {
      let next = p.documents.filter((d) => d.id !== id);
      if (p.kind === "standard" && next.length === 0) next = [newDocSlot()];
      return { ...p, documents: next };
    });
  };

  const toggleDocRequired = (id: string) =>
    setForm((p) => ({ ...p, documents: p.documents.map((d) => (d.id === id ? { ...d, required: !d.required } : d)) }));

  const updateAction = (id: string, patch: Partial<RuleDocumentAction>) => {
    setForm((p) => ({
      ...p,
      actions: p.actions.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
  };

  const addActionRow = () => setForm((p) => ({ ...p, actions: [...p.actions, newActionSlot()] }));

  const removeAction = (id: string) => {
    setForm((p) => {
      let next = p.actions.filter((a) => a.id !== id);
      if (p.kind === "conditional" && next.length === 0) next = [newActionSlot()];
      return { ...p, actions: next };
    });
  };

  const saveRule = () => {
    if (!form.name.trim()) { toast.error("Rule name is required."); return; }
    if (form.triggers.length === 0) { toast.error("Add at least one trigger condition."); return; }

    const triggerErr = triggerFieldsUnique(form.triggers);
    if (triggerErr) {
      toast.error(triggerErr);
      return;
    }

    const nameKey = form.name.trim().toLowerCase();
    const nameTaken = rules.some(
      (r) => r.id !== editingRule?.id && r.name.trim().toLowerCase() === nameKey,
    );
    if (nameTaken) {
      toast.error("Another rule already uses this name. Choose a different name.");
      return;
    }

    const documentsClean = form.documents.filter((d) => d.name.trim());
    const actionsClean = form.actions.filter((a) => a.documentName.trim());

    if (form.kind === "standard" && documentsClean.length === 0) {
      toast.error("Add at least one baseline document (search library or use a custom name).");
      return;
    }
    if (form.kind === "conditional" && actionsClean.length === 0) {
      toast.error("Add at least one document action.");
      return;
    }

    const docFileDup = duplicateStoredFileIds(documentsClean.map((d) => d.storedFileId));
    if (docFileDup) {
      toast.error(docFileDup);
      return;
    }
    const actionFileDup = duplicateStoredFileIds(actionsClean.map((a) => a.storedFileId));
    if (actionFileDup) {
      toast.error(actionFileDup);
      return;
    }

    const payload = {
      ...form,
      name: form.name.trim(),
      documents: documentsClean,
      actions: actionsClean,
    };

    const persistToApi = async () => {
      setSavingRule(true);
      try {
        const body = {
          name: payload.name,
          kind: payload.kind,
          triggers: payload.triggers,
          documents: payload.documents,
          actions: payload.actions,
          isActive: form.isActive,
        };
        if (editingRule) {
          if (!/^\d+$/.test(editingRule.id)) {
            toast.error("This rule cannot be saved to the server. Reload the page after the API is available.");
            return;
          }
          await updateDocumentRuleApi(editingRule.id, body);
          toast.success("Rule updated.");
        } else {
          await createDocumentRuleApi(body);
          toast.success("Rule created.");
        }
        const list = await listDocumentRulesFromApi();
        setRules(list);
        setShowCreate(false);
        setEditingRule(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save rule.");
      } finally {
        setSavingRule(false);
      }
    };

    if (getApiBaseUrl()) {
      void persistToApi();
      return;
    }

    if (editingRule) {
      setRules(prev => prev.map(r => r.id === editingRule.id ? {
        ...r,
        name: payload.name,
        kind: payload.kind,
        triggers: payload.triggers,
        documents: payload.documents,
        actions: payload.actions,
        isActive: form.isActive,
      } : r));
      toast.success("Rule updated.");
    } else {
      setRules(prev => [...prev, {
        id: `cfr${Date.now()}`,
        name: payload.name,
        kind: payload.kind,
        triggers: payload.triggers,
        documents: payload.documents,
        actions: payload.actions,
        isActive: form.isActive,
        createdAt: new Date().toISOString().split("T")[0],
      }]);
      toast.success("Rule created.");
    }
    setShowCreate(false);
    setEditingRule(null);
  };

  const toggleRule = async (id: string) => {
    const target = rules.find((r) => r.id === id);
    if (!target) return;
    if (getApiBaseUrl() && /^\d+$/.test(id)) {
      try {
        const updated = await patchDocumentRuleIsActiveApi(id, !target.isActive);
        setRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
        toast.success("Rule status updated.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not update rule.");
      }
      return;
    }
    setRules(prev => prev.map(r => (r.id === id ? { ...r, isActive: !r.isActive } : r)));
    toast.success("Rule status updated.");
  };

  const deleteRule = async (id: string) => {
    if (getApiBaseUrl() && /^\d+$/.test(id)) {
      try {
        await deleteDocumentRuleApi(id);
        setRules((prev) => prev.filter((r) => r.id !== id));
        toast.success("Rule deleted.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not delete rule.");
      }
      return;
    }
    setRules(prev => prev.filter(r => r.id !== id));
    toast.success("Rule deleted.");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {rulesLoadState === "loading" && (
        <p className="text-sm text-muted-foreground mb-4">Loading document rules from server…</p>
      )}
      {rulesLoadState === "error" && (
        <div className="text-sm text-destructive mb-4 space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-4">
          <p className="font-medium">Could not load or save rules from the API.</p>
          <ol className="list-decimal list-inside space-y-1 text-foreground/90">
            <li>
              Start the API: <code className="text-xs bg-muted px-1 rounded">cd backend</code> then{" "}
              <code className="text-xs bg-muted px-1 rounded">npm run dev</code> (default{" "}
              <code className="text-xs">http://localhost:4000</code>).
            </li>
            <li>
              <code className="text-xs bg-muted px-1 rounded">kathrynportal-main/.env</code> →{" "}
              <code className="text-xs">VITE_API_URL</code> must match (e.g. <code className="text-xs">http://localhost:4000</code>). Restart Vite.
            </li>
            <li>
              <code className="text-xs bg-muted px-1 rounded">backend/.env</code> → <code className="text-xs">CORS_ORIGINS</code> must include this page’s origin (e.g.{" "}
              <code className="text-xs">http://localhost:8080</code>). Restart the API.
            </li>
            <li>
              <code className="text-xs bg-muted px-1 rounded">backend/.env</code> → <code className="text-xs">DATABASE_URL</code> for your DB, then in{" "}
              <code className="text-xs bg-muted px-1 rounded">backend/</code>:{" "}
              <code className="text-xs bg-muted px-1 rounded">npm run db:migrate</code> and{" "}
              <code className="text-xs bg-muted px-1 rounded">npm run db:seed:document-rules</code>.
            </li>
          </ol>
          {getApiBaseUrl() && (
            <p className="text-xs text-muted-foreground">
              Current <code className="text-xs">VITE_API_URL</code>:{" "}
              <code className="text-xs">{getApiBaseUrl()}</code>
            </p>
          )}
          {rulesLoadError && (
            <p className="text-xs text-muted-foreground whitespace-pre-wrap border-t border-border pt-2 mt-2">
              {rulesLoadError}
            </p>
          )}
          <Button type="button" variant="outline" size="sm" className="mt-1" onClick={() => void refreshRulesFromApi()}>
            Retry load
          </Button>
        </div>
      )}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div className="max-w-xl">
          <p className="text-sm text-muted-foreground">
            Define which documents auto-populate for each transaction. <strong>Standard</strong> rules set the baseline checklist; <strong>conditional</strong> rules add or remove documents when specific field values match (HOA, Tenant Occupied, Vacant Land, etc.).
            {" "}
            {getApiBaseUrl() && (
              <span className="block mt-1 text-xs">
                Rules are loaded and saved through the API (run <code className="text-xs">npm run db:migrate</code> so{" "}
                <code className="text-xs">documents_json</code> exists).
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={() => openCreate("standard")} className="gap-2" disabled={!canManageRules}>
            <Layers className="w-4 h-4" /> New Standard
          </Button>
          <Button onClick={() => openCreate("conditional")} className="gap-2" disabled={!canManageRules}>
            <Sparkles className="w-4 h-4" /> New Conditional
          </Button>
        </div>
      </div>
      {!canManageRules && (
        <p className="text-xs text-muted-foreground mb-3">You can view rules, but only admins can create, edit, delete, or toggle status.</p>
      )}

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All ({rules.length})</TabsTrigger>
          <TabsTrigger value="standard">Standard ({rules.filter(r => r.kind === "standard").length})</TabsTrigger>
          <TabsTrigger value="conditional">Conditional ({rules.filter(r => r.kind === "conditional").length})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-4">
        {filtered.map((rule, i) => (
          <motion.div
            key={rule.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className={`bg-card border rounded-lg p-5 transition-all ${
              rule.isActive ? "border-border" : "border-border/50 opacity-60"
            }`}
          >
            <div className="flex items-start justify-between mb-3 gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <p className="text-sm font-semibold text-foreground">{rule.name}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    rule.kind === "standard" ? "bg-primary/15 text-primary" : "bg-accent/30 text-accent-foreground"
                  }`}>
                    {rule.kind === "standard" ? "Standard" : "Conditional"}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    rule.isActive ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                  }`}>
                    {rule.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                  <Filter className="w-3 h-3" />
                  {rule.triggers.map((t, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 bg-secondary/60 px-2 py-0.5 rounded">
                      <span>{fieldLabel(t.field)}</span>
                      <span className="text-muted-foreground/60">=</span>
                      <span className="font-medium text-foreground">{t.value}</span>
                    </span>
                  ))}
                  <span className="ml-2">
                    {rule.kind === "standard"
                      ? `${rule.documents.length} documents`
                      : `${rule.actions.length} actions`}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => void toggleRule(rule.id)}
                  className="p-1.5 rounded-md hover:bg-secondary transition-colors disabled:opacity-50"
                  disabled={!canManageRules}
                >
                  {rule.isActive
                    ? <ToggleRight className="w-5 h-5 text-success" />
                    : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                </button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(rule)} disabled={!canManageRules}><Edit className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="sm" onClick={() => void deleteRule(rule.id)} className="text-destructive hover:text-destructive" disabled={!canManageRules}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {rule.kind === "standard" && rule.documents.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border space-y-3">
                {Object.entries(
                  rule.documents.reduce<Record<string, DocumentRule[]>>((acc, d) => {
                    const k = d.section || "Documents";
                    (acc[k] ||= []).push(d);
                    return acc;
                  }, {}),
                ).map(([section, docs]) => (
                  <div key={section}>
                    <p className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-1.5">{section}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {docs.map(doc => (
                        <div key={doc.id} className="flex items-center gap-2 text-xs py-1.5 px-2.5 bg-secondary/50 rounded-md">
                          <span className="flex-1 text-foreground truncate" title={doc.name}>{doc.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            doc.required ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          }`}>
                            {doc.required ? "Required" : "Optional"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {rule.kind === "conditional" && rule.actions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {rule.actions.map(a => (
                    <div key={a.id} className="flex items-start gap-2 text-xs py-1.5 px-2.5 bg-secondary/50 rounded-md">
                      <span className="flex-1 text-foreground">
                        {a.documentName}
                        {a.storedFileId && (
                          <span className="block text-[10px] text-muted-foreground mt-0.5">CRM library file</span>
                        )}
                        {a.note && <span className="block text-[10px] text-muted-foreground mt-0.5 italic">{a.note}</span>}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${actionStyles[a.action]}`}>
                        {actionLabels[a.action]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No rules in this view yet.
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) { setShowCreate(false); setEditingRule(null); } }}>
        <DialogContent className="max-h-[88vh] min-w-0 w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto overflow-x-hidden sm:w-full">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Edit" : "Create"} {form.kind === "standard" ? "Standard" : "Conditional"} Rule
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2 min-w-0 overflow-x-hidden">
            <div className="space-y-2">
              <label className="text-sm font-medium">Rule Name *</label>
              <Input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder={form.kind === "standard" ? "e.g. Standard Listing Checklist" : 'e.g. When "HOA" is Yes'}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Kind</label>
              <Select
                value={form.kind}
                onValueChange={(v) => {
                  const k = v as RuleKind;
                  setForm((p) => ({
                    ...p,
                    kind: k,
                    documents: k === "standard" ? [newDocSlot()] : [],
                    actions: k === "conditional" ? [newActionSlot()] : [],
                  }));
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard — baseline checklist</SelectItem>
                  <SelectItem value="conditional">Conditional — overlay actions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={form.isActive ? "active" : "inactive"}
                onValueChange={(v) => setForm((p) => ({ ...p, isActive: v === "active" }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active — rule is evaluated</SelectItem>
                  <SelectItem value="inactive">Inactive — rule is ignored</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Stored in the database as <code className="text-[10px]">is_active</code> on <code className="text-[10px]">conditional_rules</code>.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Trigger Conditions (ALL must match)</label>
                <Button variant="ghost" size="sm" onClick={addTrigger} className="gap-1 h-7"><Plus className="w-3 h-3" /> Add</Button>
              </div>
              <div className="space-y-2">
                {form.triggers.map((t, idx) => {
                  const opts = triggerFieldOptions.find(o => o.value === t.field)?.values ?? [];
                  return (
                    <div key={idx} className="flex flex-wrap items-center gap-2 w-full min-w-0">
                      <Select value={t.field} onValueChange={v => updateTrigger(idx, { field: v as RuleTriggerField, value: triggerFieldOptions.find(o => o.value === v)?.values[0] ?? "" })}>
                        <SelectTrigger className="min-w-0 flex-1 basis-[min(100%,10rem)]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {triggerFieldOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground text-sm shrink-0">=</span>
                      <Select value={t.value} onValueChange={v => updateTrigger(idx, { value: v })}>
                        <SelectTrigger className="min-w-0 flex-1 basis-[min(100%,8rem)]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {opts.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {form.triggers.length > 1 && (
                        <button type="button" onClick={() => removeTrigger(idx)} className="text-destructive p-1.5 hover:bg-destructive/10 rounded-md shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {form.kind === "standard" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Baseline Documents</label>
                <p className="text-xs text-muted-foreground">
                  Each row is one checklist line: open the field, search CRM uploads (Documents page pool), or type and
                  choose &quot;Use … as document name&quot;. Add another row for the next document.
                </p>
                <div className="space-y-2 max-h-[320px] overflow-y-auto overflow-x-hidden pr-1 min-w-0">
                  {form.documents.map((doc) => (
                    <div key={doc.id} className="flex flex-wrap items-center gap-2 bg-secondary/50 rounded-md px-2 py-2 w-full min-w-0">
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 hidden sm:block" />
                      <div className="min-w-0 flex-1 basis-full sm:basis-[12rem] sm:min-w-[8rem]">
                        <DocumentNameSlotCombobox
                          files={vaultFiles}
                          value={doc.name}
                          excludeStoredFileIds={form.documents
                            .filter((d) => d.id !== doc.id && d.storedFileId)
                            .map((d) => d.storedFileId!)}
                          onChange={(next) =>
                            updateDocument(doc.id, {
                              name: next.name,
                              storedFileId: next.storedFileId,
                            })
                          }
                          placeholder="Search library or type name…"
                        />
                      </div>
                      {doc.storedFileId && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                          CRM file
                        </span>
                      )}
                      {doc.section && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                          {doc.section}
                        </span>
                      )}
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer shrink-0">
                        <Checkbox checked={doc.required} onCheckedChange={() => toggleDocRequired(doc.id)} />
                        Required
                      </label>
                      <button
                        type="button"
                        onClick={() => removeDocument(doc.id)}
                        className="text-destructive hover:text-destructive/80 p-1 shrink-0"
                        aria-label="Remove row"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" className="gap-1 h-8" onClick={addDocumentRow}>
                  <Plus className="w-3 h-3" /> Add baseline document row
                </Button>
              </div>
            )}

            {form.kind === "conditional" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Document Actions</label>
                <p className="text-xs text-muted-foreground">
                  When triggers match, each row applies to one document. Search the CRM library or set a custom name,
                  then choose the action type for that row.
                </p>
                <div className="space-y-2 max-h-[320px] overflow-y-auto overflow-x-hidden pr-1 min-w-0">
                  {form.actions.map((a) => (
                    <div key={a.id} className="flex flex-wrap items-center gap-2 bg-secondary/50 rounded-md px-2 py-2 w-full min-w-0">
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 hidden sm:block" />
                      <div className="min-w-0 flex-1 basis-full sm:basis-[12rem] sm:min-w-[8rem]">
                        <DocumentNameSlotCombobox
                          files={vaultFiles}
                          value={a.documentName}
                          excludeStoredFileIds={form.actions
                            .filter((x) => x.id !== a.id && x.storedFileId)
                            .map((x) => x.storedFileId!)}
                          onChange={(next) =>
                            updateAction(a.id, {
                              documentName: next.name,
                              storedFileId: next.storedFileId,
                            })
                          }
                          placeholder="Search library or type name…"
                        />
                      </div>
                      {a.storedFileId && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                          CRM file
                        </span>
                      )}
                      <Select
                        value={a.action}
                        onValueChange={(v) => updateAction(a.id, { action: v as RuleAction })}
                      >
                        <SelectTrigger className="w-full min-w-0 sm:w-[min(148px,100%)] sm:max-w-[148px] shrink-0 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="add-required">Add Required</SelectItem>
                          <SelectItem value="add-optional">Add Optional</SelectItem>
                          <SelectItem value="mark-na">Mark N/A</SelectItem>
                        </SelectContent>
                      </Select>
                      <button
                        type="button"
                        onClick={() => removeAction(a.id)}
                        className="text-destructive hover:text-destructive/80 p-1 shrink-0"
                        aria-label="Remove row"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" className="gap-1 h-8" onClick={addActionRow}>
                  <Plus className="w-3 h-3" /> Add document action row
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditingRule(null); }}>Cancel</Button>
            <Button onClick={() => void saveRule()} disabled={savingRule} className="gap-2">
              <Save className="w-4 h-4" /> {savingRule ? "Saving…" : editingRule ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
