import { useMemo, useState } from "react";
import { Plus, Edit, Trash2, Save, X, ToggleLeft, ToggleRight, GripVertical, Layers, Filter, Sparkles } from "lucide-react";
import {
  conditionalFormattingRules as initialRules,
  type ConditionalFormattingRule,
  type DocumentRule,
  type RuleDocumentAction,
  type RuleTrigger,
  type RuleTriggerField,
  type RuleAction,
  type RuleKind,
} from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { motion } from "framer-motion";

const triggerFieldOptions: { value: RuleTriggerField; label: string; values: string[] }[] = [
  { value: "transactionType", label: "Transaction Type", values: ["Listing", "Buyer File"] },
  { value: "propertyType", label: "Property Type", values: ["SFR", "Condo", "Vacant Land", "Townhouse", "Multi-Family", "Other"] },
  { value: "exemptSeller", label: "Exempt Seller", values: ["Yes", "No"] },
  { value: "hoa", label: "HOA", values: ["Yes", "No"] },
  { value: "tenantOccupied", label: "Tenant Occupied", values: ["Yes", "No"] },
  { value: "county", label: "County", values: ["Marin", "Sonoma", "Napa", "San Francisco", "Other"] },
  { value: "dualAgency", label: "Dual Agency", values: ["Yes", "No"] },
  { value: "financing", label: "Financing", values: ["All Cash", "Conventional", "FHA", "VA", "Other"] },
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

interface FormState {
  name: string;
  kind: RuleKind;
  triggers: RuleTrigger[];
  documents: DocumentRule[];
  actions: RuleDocumentAction[];
}

const blankForm = (kind: RuleKind = "conditional"): FormState => ({
  name: "",
  kind,
  triggers: [{ field: "transactionType", value: "Listing" }],
  documents: [],
  actions: [],
});

export default function FormattingRulesTab() {
  const [rules, setRules] = useState<ConditionalFormattingRule[]>(initialRules);
  const [showCreate, setShowCreate] = useState(false);
  const [editingRule, setEditingRule] = useState<ConditionalFormattingRule | null>(null);
  const [form, setForm] = useState<FormState>(blankForm());
  const [newDocName, setNewDocName] = useState("");
  const [newActionName, setNewActionName] = useState("");
  const [newActionType, setNewActionType] = useState<RuleAction>("add-required");
  const [filter, setFilter] = useState<"all" | "standard" | "conditional">("all");

  const filtered = useMemo(
    () => rules.filter(r => filter === "all" || r.kind === filter),
    [rules, filter],
  );

  const openCreate = (kind: RuleKind) => {
    setForm(blankForm(kind));
    setEditingRule(null);
    setNewDocName("");
    setNewActionName("");
    setShowCreate(true);
  };

  const openEdit = (rule: ConditionalFormattingRule) => {
    setForm({
      name: rule.name,
      kind: rule.kind,
      triggers: rule.triggers.length ? [...rule.triggers] : [{ field: "transactionType", value: "Listing" }],
      documents: [...rule.documents],
      actions: [...rule.actions],
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
  const addTrigger = () => setForm(p => ({ ...p, triggers: [...p.triggers, { field: "propertyType", value: "Any" }] }));
  const removeTrigger = (idx: number) => setForm(p => ({ ...p, triggers: p.triggers.filter((_, i) => i !== idx) }));

  const addDocument = () => {
    if (!newDocName.trim()) return;
    setForm(p => ({
      ...p,
      documents: [...p.documents, { id: `d${Date.now()}`, name: newDocName.trim(), required: true }],
    }));
    setNewDocName("");
  };
  const removeDocument = (id: string) => setForm(p => ({ ...p, documents: p.documents.filter(d => d.id !== id) }));
  const toggleDocRequired = (id: string) =>
    setForm(p => ({ ...p, documents: p.documents.map(d => (d.id === id ? { ...d, required: !d.required } : d)) }));

  const addAction = () => {
    if (!newActionName.trim()) return;
    setForm(p => ({
      ...p,
      actions: [...p.actions, { id: `a${Date.now()}`, documentName: newActionName.trim(), action: newActionType }],
    }));
    setNewActionName("");
  };
  const removeAction = (id: string) => setForm(p => ({ ...p, actions: p.actions.filter(a => a.id !== id) }));

  const saveRule = () => {
    if (!form.name.trim()) { toast.error("Rule name is required."); return; }
    if (form.triggers.length === 0) { toast.error("Add at least one trigger condition."); return; }
    if (form.kind === "standard" && form.documents.length === 0) {
      toast.error("Standard rules need at least one document.");
      return;
    }
    if (form.kind === "conditional" && form.actions.length === 0) {
      toast.error("Conditional rules need at least one document action.");
      return;
    }

    if (editingRule) {
      setRules(prev => prev.map(r => r.id === editingRule.id ? {
        ...r,
        name: form.name.trim(),
        kind: form.kind,
        triggers: form.triggers,
        documents: form.documents,
        actions: form.actions,
      } : r));
      toast.success("Rule updated.");
    } else {
      setRules(prev => [...prev, {
        id: `cfr${Date.now()}`,
        name: form.name.trim(),
        kind: form.kind,
        triggers: form.triggers,
        documents: form.documents,
        actions: form.actions,
        isActive: true,
        createdAt: new Date().toISOString().split("T")[0],
      }]);
      toast.success("Rule created.");
    }
    setShowCreate(false);
    setEditingRule(null);
  };

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => (r.id === id ? { ...r, isActive: !r.isActive } : r)));
    toast.success("Rule status updated.");
  };
  const deleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    toast.success("Rule deleted.");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div className="max-w-xl">
          <p className="text-sm text-muted-foreground">
            Define which documents auto-populate for each transaction. <strong>Standard</strong> rules set the baseline checklist; <strong>conditional</strong> rules add or remove documents when specific field values match (HOA, Tenant Occupied, Vacant Land, etc.).
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={() => openCreate("standard")} className="gap-2">
            <Layers className="w-4 h-4" /> New Standard
          </Button>
          <Button onClick={() => openCreate("conditional")} className="gap-2">
            <Sparkles className="w-4 h-4" /> New Conditional
          </Button>
        </div>
      </div>

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
                <button onClick={() => toggleRule(rule.id)} className="p-1.5 rounded-md hover:bg-secondary transition-colors">
                  {rule.isActive
                    ? <ToggleRight className="w-5 h-5 text-success" />
                    : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                </button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(rule)}><Edit className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="sm" onClick={() => deleteRule(rule.id)} className="text-destructive hover:text-destructive">
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
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Edit" : "Create"} {form.kind === "standard" ? "Standard" : "Conditional"} Rule
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
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
              <Select value={form.kind} onValueChange={v => setForm(p => ({ ...p, kind: v as RuleKind }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard — baseline checklist</SelectItem>
                  <SelectItem value="conditional">Conditional — overlay actions</SelectItem>
                </SelectContent>
              </Select>
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
                    <div key={idx} className="flex items-center gap-2">
                      <Select value={t.field} onValueChange={v => updateTrigger(idx, { field: v as RuleTriggerField, value: triggerFieldOptions.find(o => o.value === v)?.values[0] ?? "" })}>
                        <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {triggerFieldOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground text-sm">=</span>
                      <Select value={t.value} onValueChange={v => updateTrigger(idx, { value: v })}>
                        <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {opts.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {form.triggers.length > 1 && (
                        <button onClick={() => removeTrigger(idx)} className="text-destructive p-1.5 hover:bg-destructive/10 rounded-md">
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
                <div className="flex gap-2">
                  <Input
                    value={newDocName}
                    onChange={e => setNewDocName(e.target.value)}
                    placeholder="Document name..."
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addDocument())}
                  />
                  <Button variant="outline" onClick={addDocument} className="shrink-0"><Plus className="w-4 h-4" /></Button>
                </div>

                {form.documents.length > 0 && (
                  <div className="space-y-1.5 mt-3 max-h-[300px] overflow-y-auto pr-1">
                    {form.documents.map(doc => (
                      <div key={doc.id} className="flex items-center gap-3 bg-secondary/50 rounded-md px-3 py-2">
                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                        <span className="text-sm flex-1 truncate" title={doc.name}>{doc.name}</span>
                        {doc.section && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{doc.section}</span>}
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer shrink-0">
                          <Checkbox checked={doc.required} onCheckedChange={() => toggleDocRequired(doc.id)} />
                          Required
                        </label>
                        <button onClick={() => removeDocument(doc.id)} className="text-destructive hover:text-destructive/80 p-1 shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {form.kind === "conditional" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Document Actions</label>
                <p className="text-xs text-muted-foreground">When triggers match, these documents are added to or removed from the checklist.</p>
                <div className="flex gap-2">
                  <Input
                    value={newActionName}
                    onChange={e => setNewActionName(e.target.value)}
                    placeholder="Document name..."
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addAction())}
                    className="flex-1"
                  />
                  <Select value={newActionType} onValueChange={v => setNewActionType(v as RuleAction)}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add-required">Add Required</SelectItem>
                      <SelectItem value="add-optional">Add Optional</SelectItem>
                      <SelectItem value="mark-na">Mark N/A</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={addAction} className="shrink-0"><Plus className="w-4 h-4" /></Button>
                </div>

                {form.actions.length > 0 && (
                  <div className="space-y-1.5 mt-3 max-h-[300px] overflow-y-auto pr-1">
                    {form.actions.map(a => (
                      <div key={a.id} className="flex items-center gap-3 bg-secondary/50 rounded-md px-3 py-2">
                        <span className="text-sm flex-1 truncate" title={a.documentName}>{a.documentName}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${actionStyles[a.action]}`}>
                          {actionLabels[a.action]}
                        </span>
                        <button onClick={() => removeAction(a.id)} className="text-destructive hover:text-destructive/80 p-1 shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditingRule(null); }}>Cancel</Button>
            <Button onClick={saveRule} className="gap-2"><Save className="w-4 h-4" /> {editingRule ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
