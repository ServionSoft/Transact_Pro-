import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { Plus, Edit, Trash2, Save, X, Users, Mail as MailIcon, UserPlus, Shield, FileText, Tags, Server } from "lucide-react";
import { teamMembers as initialTeam, type EmailTemplate, type TeamMember } from "@/data/mockData";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { listTeamMembersFromApi, type TeamMemberListItem } from "@/api/teamMembers";
import { useAuthStore } from "@/store/authStore";
import { useAppStore } from "@/store/appStore";
import FormattingRulesTabComponent from "@/components/settings/FormattingRulesTab";
import SmtpSettingsTab from "@/components/settings/SmtpSettingsTab";
import RoleProfilesTabComponent from "@/components/settings/RoleProfilesTab";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function SettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canManageRoles = useAuthStore(
    (s) =>
      s.user?.role === "super_admin" ||
      (s.user?.permissions?.includes("role_profiles.create") ?? false) ||
      (s.user?.permissions?.includes("role_profiles.edit") ?? false) ||
      (s.user?.permissions?.includes("role_profiles.delete") ?? false) ||
      (s.user?.permissions?.includes("role_profiles.view") ?? false)
  );
  const canManageSmtp = useAuthStore(
    (s) =>
      s.user?.role === "super_admin" || (s.user?.permissions?.includes("settings.manage_integrations") ?? false)
  );
  const settingsTabs = useMemo(() => {
    const tabs: { id: string; label: string; icon: LucideIcon }[] = [
      { id: "templates", label: "Email Templates", icon: MailIcon },
      { id: "team", label: "Team Members", icon: Users },
      { id: "formatting", label: "Document Rules", icon: FileText },
    ];
    if (canManageRoles) {
      tabs.push({ id: "roles", label: "Permission profiles", icon: Tags });
    }
    if (canManageSmtp) {
      tabs.push({ id: "smtp", label: "Email / SMTP", icon: Server });
    }
    tabs.push({ id: "account", label: "Account", icon: Shield });
    return tabs;
  }, [canManageRoles, canManageSmtp]);
  const canViewTeam = useAuthStore(
    (s) => s.user?.role === "super_admin" || s.user?.permissions?.includes("team_members.view")
  );
  const canCreateTeam = useAuthStore(
    (s) => s.user?.role === "super_admin" || s.user?.permissions?.includes("team_members.create")
  );
  const canInviteTeam = useAuthStore(
    (s) => s.user?.role === "super_admin" || s.user?.permissions?.includes("team_members.invite")
  );
  const [activeTab, setActiveTab] = useState("templates");

  useEffect(() => {
    const tab = (location.state as { activeTab?: string } | null)?.activeTab;
    if (tab === "team") setActiveTab("team");
    if (tab === "roles" && canManageRoles) setActiveTab("roles");
  }, [location.state, canManageRoles]);

  // Templates state — backed by shared store
  const templates = useAppStore(s => s.emailTemplates);
  const addEmailTemplate = useAppStore(s => s.addEmailTemplate);
  const updateEmailTemplate = useAppStore(s => s.updateEmailTemplate);
  const deleteEmailTemplateAction = useAppStore(s => s.deleteEmailTemplate);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: "", category: "Agent Email", subject: "", body: "" });
  const [editValues, setEditValues] = useState<Partial<EmailTemplate>>({});

  // Team state — API when configured, else mock
  const [team, setTeam] = useState<TeamMember[]>(initialTeam);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);

  const [teamReload, setTeamReload] = useState(0);

  const mapApiToUi = (u: TeamMemberListItem): TeamMember => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role:
      u.role === "coordinator"
        ? "Coordinator"
        : u.role === "admin"
          ? "Admin"
          : u.role === "super_admin"
            ? "Super Admin"
            : "Admin",
    status: u.status === "active" ? "Active" : u.status === "invited" ? "Invited" : "Inactive",
    joinedAt: u.createdAt.split("T")[0] ?? "",
    lastActive: u.lastActiveAt ? u.lastActiveAt.split("T")[0] : "",
    permissionProfile: [u.designation, u.roleProfileName].filter(Boolean).join(" · ") || null,
  });

  useEffect(() => {
    if (!getApiBaseUrl() || !canViewTeam) return;
    let cancelled = false;
    setTeamLoading(true);
    setTeamError(null);
    void listTeamMembersFromApi()
      .then((rows) => {
        if (!cancelled) setTeam(rows.map(mapApiToUi));
      })
      .catch((e) => {
        if (!cancelled) setTeamError(e instanceof Error ? e.message : "Could not load team.");
      })
      .finally(() => {
        if (!cancelled) setTeamLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, canViewTeam, teamReload]);

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

  const openTeamMemberEditor = (id: string) => {
    if (getApiBaseUrl()) navigate(`/settings/team-members/${id}/edit`);
  };

  const removeTeamMemberMock = (id: string) => {
    setTeam((prev) => prev.filter((t) => t.id !== id));
    toast.success("Team member removed.");
  };

  const categories = ["Agent Email", "Contact Reminder", "Document Request"];
  const permissionProfileLabel = user?.roleProfileName?.trim()
    ? user.roleProfileName
    : user?.role === "super_admin"
      ? "Super Admin (built-in)"
      : "No profile assigned";

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
          <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
            <p className="text-sm text-muted-foreground">
              Manage team members who have access to the portal. Use Create for an active account with password, or Invite for email activation flow.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              {canCreateTeam && (
                <Button variant="outline" onClick={() => navigate("/settings/team-members/new?mode=create")} className="gap-2">
                  <Plus className="w-4 h-4" /> Create Member
                </Button>
              )}
              {canInviteTeam && (
                <Button onClick={() => navigate("/settings/team-members/new?mode=invite")} className="gap-2">
                  <UserPlus className="w-4 h-4" /> Invite Member
                </Button>
              )}
            </div>
          </div>

          {teamLoading && <p className="text-sm text-muted-foreground mb-2">Loading team…</p>}
          {teamError && (
            <p className="text-sm text-destructive mb-2">
              {teamError}{" "}
              <Button variant="link" className="p-0 h-auto" onClick={() => setTeamReload((x) => x + 1)}>
                Retry
              </Button>
            </p>
          )}

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
                    <th className="px-6 py-3 font-medium">Name</th>
                    <th className="px-6 py-3 font-medium">Email</th>
                    <th className="px-6 py-3 font-medium">Role</th>
                    <th className="px-6 py-3 font-medium">Profile</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Last Active</th>
                    <th className="px-6 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {team.map((member) => (
                    <tr
                      key={member.id}
                      className={`hover:bg-secondary/30 transition-colors ${getApiBaseUrl() ? "cursor-pointer" : ""}`}
                      onClick={() => {
                        if (getApiBaseUrl()) openTeamMemberEditor(member.id);
                      }}
                    >
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
                          member.role === "Admin" || member.role === "Super Admin"
                            ? "bg-primary/10 text-primary"
                            : "bg-secondary text-foreground"
                        }`}>
                          {member.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground max-w-[140px] truncate" title={member.permissionProfile ?? ""}>
                        {member.permissionProfile ?? "—"}
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
                        {getApiBaseUrl() ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openTeamMemberEditor(member.id);
                            }}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                        ) : (
                          member.role !== "Admin" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeTeamMemberMock(member.id);
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </motion.div>
      )}

      {/* Conditional Formatting Rules Tab */}
      {activeTab === "formatting" && <FormattingRulesTabComponent />}

      {activeTab === "roles" && canManageRoles && <RoleProfilesTabComponent />}

      {activeTab === "smtp" && canManageSmtp && <SmtpSettingsTab />}

      {/* Account Tab */}
      {activeTab === "account" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-display font-semibold text-foreground mb-4">Profile Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Full Name</label>
                <Input value={user?.name ?? ""} readOnly />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input value={user?.email ?? ""} readOnly />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Designation</label>
                <Input value={user?.designation ?? "—"} readOnly />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Permission Profile</label>
                <Input value={permissionProfileLabel} readOnly />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <p className="text-xs text-muted-foreground">
                Profile data is loaded from your signed-in account.
              </p>
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
              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Email (SMTP)</p>
                  <p className="text-xs text-muted-foreground">Send emails from the portal using your mail server</p>
                </div>
                {canManageSmtp ? (
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("smtp")} className="gap-1 shrink-0">
                    Configure
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground shrink-0">Ask an admin</span>
                )}
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
