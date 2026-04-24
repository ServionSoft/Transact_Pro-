import { useState } from "react";
import { Plus, Edit, Trash2, Save, X, Users, Mail as MailIcon, UserPlus, Shield, FileText } from "lucide-react";
import { teamMembers as initialTeam, type EmailTemplate, type TeamMember } from "@/data/mockData";
import { useAppStore } from "@/store/appStore";
import FormattingRulesTabComponent from "@/components/settings/FormattingRulesTab";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { motion } from "framer-motion";

const settingsTabs = [
  { id: "templates", label: "Email Templates", icon: MailIcon },
  { id: "team", label: "Team Members", icon: Users },
  { id: "formatting", label: "Document Rules", icon: FileText },
  { id: "account", label: "Account", icon: Shield },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("templates");

  // Templates state — backed by shared store
  const templates = useAppStore(s => s.emailTemplates);
  const addEmailTemplate = useAppStore(s => s.addEmailTemplate);
  const updateEmailTemplate = useAppStore(s => s.updateEmailTemplate);
  const deleteEmailTemplateAction = useAppStore(s => s.deleteEmailTemplate);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: "", category: "Agent Email", subject: "", body: "" });
  const [editValues, setEditValues] = useState<Partial<EmailTemplate>>({});

  // Team state
  const [team, setTeam] = useState<TeamMember[]>(initialTeam);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", role: "Coordinator" as TeamMember["role"] });

  const startEdit = (t: EmailTemplate) => {
    setEditingId(t.id);
    setEditValues({ name: t.name, category: t.category, subject: t.subject, body: t.body });
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateEmailTemplate(editingId, editValues);
    setEditingId(null);
    toast.success("Template updated!");
  };

  const addTemplate = () => {
    if (!newTemplate.name || !newTemplate.subject) {
      toast.error("Name and subject are required.");
      return;
    }
    addEmailTemplate(newTemplate);
    setShowNew(false);
    setNewTemplate({ name: "", category: "Agent Email", subject: "", body: "" });
    toast.success("Template created!");
  };

  const deleteTemplate = (id: string) => {
    deleteEmailTemplateAction(id);
    toast.success("Template deleted.");
  };

  const inviteTeamMember = () => {
    if (!inviteForm.name || !inviteForm.email) {
      toast.error("Name and email are required.");
      return;
    }
    setTeam(prev => [...prev, {
      id: `tm${Date.now()}`,
      name: inviteForm.name,
      email: inviteForm.email,
      role: inviteForm.role,
      status: "Invited",
      joinedAt: new Date().toISOString().split("T")[0],
      lastActive: "",
    }]);
    setShowInvite(false);
    setInviteForm({ name: "", email: "", role: "Coordinator" });
    toast.success("Invitation sent!", { description: `${inviteForm.name} has been invited to the portal.` });
  };

  const removeTeamMember = (id: string) => {
    setTeam(prev => prev.filter(t => t.id !== id));
    toast.success("Team member removed.");
  };

  const categories = ["Agent Email", "Client Reminder", "Document Request"];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader title="Settings" subtitle="Manage templates, team members, and account preferences." />

      {/* Settings Tabs */}
      <div className="flex gap-1 border-b border-border mb-6">
        {settingsTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-accent text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Email Templates Tab */}
      {activeTab === "templates" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowNew(true)} className="gap-2">
              <Plus className="w-4 h-4" /> New Template
            </Button>
          </div>

          {showNew && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-accent/30 rounded-lg p-6 mb-6">
              <h3 className="font-display font-semibold text-foreground mb-4">Create New Template</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Template Name *</label>
                  <Input value={newTemplate.name} onChange={e => setNewTemplate(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Follow-Up Reminder" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Category</label>
                  <Select value={newTemplate.category} onValueChange={v => setNewTemplate(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-4 mb-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Subject *</label>
                  <Input value={newTemplate.subject} onChange={e => setNewTemplate(p => ({ ...p, subject: e.target.value }))} placeholder="Email subject line..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Body</label>
                  <Textarea value={newTemplate.body} onChange={e => setNewTemplate(p => ({ ...p, body: e.target.value }))} rows={6} placeholder="Use {{agent_name}}, {{property_address}} as variables..." />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
                <Button onClick={addTemplate} className="gap-2"><Save className="w-4 h-4" /> Save Template</Button>
              </div>
            </motion.div>
          )}

          <div className="space-y-4">
            {templates.map((template, i) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="bg-card border border-border rounded-lg p-5"
              >
                {editingId === template.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input value={editValues.name || ""} onChange={e => setEditValues(p => ({ ...p, name: e.target.value }))} />
                      <Select value={editValues.category || ""} onValueChange={v => setEditValues(p => ({ ...p, category: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Input value={editValues.subject || ""} onChange={e => setEditValues(p => ({ ...p, subject: e.target.value }))} placeholder="Subject" />
                    <Textarea value={editValues.body || ""} onChange={e => setEditValues(p => ({ ...p, body: e.target.value }))} rows={5} />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingId(null)}><X className="w-3 h-3 mr-1" /> Cancel</Button>
                      <Button size="sm" onClick={saveEdit}><Save className="w-3 h-3 mr-1" /> Save</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{template.name}</p>
                        <p className="text-xs text-muted-foreground">{template.category}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(template)}><Edit className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteTemplate(template.id)} className="text-destructive hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1"><strong>Subject:</strong> {template.subject}</p>
                    <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-3">{template.body}</p>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Team Members Tab */}
      {activeTab === "team" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Manage team members who have access to the portal. All team members can view and manage transactions.
            </p>
            <Button onClick={() => setShowInvite(true)} className="gap-2">
              <UserPlus className="w-4 h-4" /> Invite Member
            </Button>
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
                    <th className="px-6 py-3 font-medium">Name</th>
                    <th className="px-6 py-3 font-medium">Email</th>
                    <th className="px-6 py-3 font-medium">Role</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Last Active</th>
                    <th className="px-6 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {team.map(member => (
                    <tr key={member.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {member.name.split(" ").map(n => n[0]).join("")}
                          </div>
                          <span className="text-sm font-medium text-foreground">{member.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{member.email}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          member.role === "Admin" ? "bg-primary/10 text-primary" : "bg-secondary text-foreground"
                        }`}>
                          {member.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          member.status === "Active" ? "bg-success/15 text-success" :
                          member.status === "Invited" ? "bg-accent/15 text-accent" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {member.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {member.lastActive || "—"}
                      </td>
                      <td className="px-6 py-4">
                        {member.role !== "Admin" && (
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => removeTeamMember(member.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invite Modal */}
          <Dialog open={showInvite} onOpenChange={setShowInvite}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" /> Invite Team Member
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Full Name *</label>
                  <Input value={inviteForm.name} onChange={e => setInviteForm(p => ({ ...p, name: e.target.value }))} placeholder="Jessica Rivera" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Email Address *</label>
                  <Input value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} placeholder="jessica@company.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Role</label>
                  <Select value={inviteForm.role} onValueChange={v => setInviteForm(p => ({ ...p, role: v as TeamMember["role"] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Coordinator">Coordinator</SelectItem>
                      <SelectItem value="Viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">All team members have equal access in Phase 1. Advanced permissions coming in Phase 2.</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
                <Button onClick={inviteTeamMember} className="gap-2">
                  <UserPlus className="w-4 h-4" /> Send Invitation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>
      )}

      {/* Conditional Formatting Rules Tab */}
      {activeTab === "formatting" && <FormattingRulesTabComponent />}

      {/* Account Tab */}
      {activeTab === "account" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-display font-semibold text-foreground mb-4">Profile Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Full Name</label>
                <Input defaultValue="Kathryn Santos" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input defaultValue="kathryn@portal.com" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Phone</label>
                <Input defaultValue="(555) 123-4567" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Company</label>
                <Input defaultValue="Kathryn Santos TC Services" />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={() => toast.success("Profile updated!")} className="gap-2">
                <Save className="w-4 h-4" /> Save Changes
              </Button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-display font-semibold text-foreground mb-4">Integrations</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">DocuSign</p>
                  <p className="text-xs text-muted-foreground">Send documents for signature directly from the portal</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => toast.success("DocuSign connected!")} className="gap-1">
                  Connected ✓
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">Email (SMTP)</p>
                  <p className="text-xs text-muted-foreground">Send emails directly from the portal</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => toast.success("Email configured!")} className="gap-1">
                  Configured ✓
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-display font-semibold text-foreground mb-4">Security</h3>
            <div className="space-y-3">
              <Button variant="outline" onClick={() => toast.success("Password reset email sent!")}>
                Change Password
              </Button>
              <p className="text-xs text-muted-foreground">Last password change: March 15, 2026</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
