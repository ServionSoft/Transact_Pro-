import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  deactivateTeamMemberApi,
  getTeamMemberFromApi,
  listProjectsPickerFromApi,
  updateTeamMemberApi,
  type TeamMemberStatus,
} from "@/api/teamMembers";
import { listRoleProfilesFromApi, type RoleProfileListItem } from "@/api/roleProfiles";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { useAuthStore } from "@/store/authStore";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DEFAULT_DESIGNATIONS = ["Admin", "Employee", "Editor", "Coordinator", "Manager"] as const;

export default function TeamMemberEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const selfId = useAuthStore((s) => s.user?.id);
  const actor = useAuthStore((s) => s.user);

  const canAssignProjects = useMemo(
    () => actor?.role === "super_admin" || actor?.permissions?.includes("team_members.assign_projects"),
    [actor]
  );
  const actorIsSuper = actor?.role === "super_admin";

  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [designationOptions, setDesignationOptions] = useState<string[]>([...DEFAULT_DESIGNATIONS]);
  const [email, setEmail] = useState("");
  const [wasSuperAdmin, setWasSuperAdmin] = useState(false);
  const [status, setStatus] = useState<TeamMemberStatus>("active");
  const [profiles, setProfiles] = useState<RoleProfileListItem[]>([]);
  const [roleProfileId, setRoleProfileId] = useState("");
  const [convertFromSuper, setConvertFromSuper] = useState(false);
  const [promoteToSuper, setPromoteToSuper] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [projectPicked, setProjectPicked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inviteEmailStatus, setInviteEmailStatus] = useState<"pending" | "sent" | "failed" | null>(null);
  const [inviteEmailError, setInviteEmailError] = useState<string | null>(null);
  const [inviteEmailSentAt, setInviteEmailSentAt] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !getApiBaseUrl()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [m, profRows, projs] = await Promise.all([
          getTeamMemberFromApi(id),
          listRoleProfilesFromApi(),
          listProjectsPickerFromApi(),
        ]);
        if (cancelled) return;
        setName(m.name);
        setDesignation(m.designation ?? "");
        setEmail(m.email);
        const superUser = m.role === "super_admin";
        setWasSuperAdmin(superUser);
        setStatus(m.status);
        setProfiles(profRows);
        const merged = [...DEFAULT_DESIGNATIONS];
        for (const row of profRows) {
          const trimmed = (row.defaultDesignation ?? "").trim();
          if (trimmed && !merged.some((x) => x.toLowerCase() === trimmed.toLowerCase())) merged.push(trimmed);
        }
        setDesignationOptions(merged);
        setConvertFromSuper(false);
        setPromoteToSuper(false);
        if (superUser) {
          setRoleProfileId(profRows[0]?.id ?? "");
        } else {
          setRoleProfileId(m.roleProfileId ?? profRows[0]?.id ?? "");
        }
        setProjectPicked(new Set(m.projectIds));
        setProjects(projs);
        setInviteEmailStatus(m.inviteEmailStatus ?? null);
        setInviteEmailError(m.inviteEmailError ?? null);
        setInviteEmailSentAt(m.inviteEmailSentAt ?? null);
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Load failed.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (wasSuperAdmin && !convertFromSuper) return;
    if (!roleProfileId && profiles.length > 0) {
      setRoleProfileId(profiles[0]!.id);
    }
  }, [wasSuperAdmin, convertFromSuper, profiles, roleProfileId]);

  useEffect(() => {
    if (wasSuperAdmin && !convertFromSuper) return;
    const profile = profiles.find((p) => p.id === roleProfileId);
    const profileDefaultDesignation = profile?.defaultDesignation?.trim();
    if (profileDefaultDesignation && !designation.trim()) {
      setDesignation(profileDefaultDesignation);
    }
  }, [wasSuperAdmin, convertFromSuper, profiles, roleProfileId, designation]);

  const toggleProject = (pid: string, on: boolean) => {
    setProjectPicked((prev) => {
      const n = new Set(prev);
      if (on) n.add(pid);
      else n.delete(pid);
      return n;
    });
  };

  const goBack = () => navigate("/settings", { state: { activeTab: "team" } });

  const onSave = async () => {
    if (!id || !getApiBaseUrl()) return;

    if (wasSuperAdmin) {
      if (convertFromSuper) {
        if (id === selfId) {
          toast.error("You cannot remove your own super administrator access here.");
          return;
        }
        if (!roleProfileId) {
          toast.error("Select a permission profile to convert this account.");
          return;
        }
      }
    } else {
      if (!promoteToSuper && !roleProfileId) {
        toast.error("Select a permission profile.");
        return;
      }
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        designation: designation.trim() || null,
        email: email.trim(),
        status,
      };
      if (canAssignProjects) body.projectIds = [...projectPicked];

      if (wasSuperAdmin) {
        if (convertFromSuper && roleProfileId) {
          body.roleProfileId = roleProfileId;
        }
      } else if (promoteToSuper && actorIsSuper) {
        body.role = "super_admin";
      } else {
        body.roleProfileId = roleProfileId;
      }

      await updateTeamMemberApi(id, body);
      toast.success("Member updated.");
      goBack();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const onDeactivate = async () => {
    if (!id || !getApiBaseUrl()) return;
    if (id === selfId) {
      toast.error("You cannot deactivate your own account here.");
      return;
    }
    if (!window.confirm("Deactivate this user? They will no longer be able to sign in.")) return;
    setSaving(true);
    try {
      await deactivateTeamMemberApi(id);
      toast.success("User deactivated.");
      goBack();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Deactivate failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={goBack}>
        ← Back
      </Button>
      <PageHeader
        title="Edit team member"
        subtitle="Update name, email, status, designation, and permission profile. Super administrators are a separate path."
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-6 bg-card border border-border rounded-lg p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Designation</Label>
              <Input
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Senior editor"
                list="designation-options-edit"
              />
              <datalist id="designation-options-edit">
                {designationOptions.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="space-y-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as TeamMemberStatus)}>
              <SelectTrigger className="max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="invited">Invited</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {status === "invited" && inviteEmailStatus != null && (
            <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1">
              <p className="text-sm font-medium">Invite email delivery</p>
              <p className="text-xs text-muted-foreground">
                Status: <span className="text-foreground font-medium">{inviteEmailStatus}</span>
                {inviteEmailSentAt
                  ? ` · ${new Date(inviteEmailSentAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}`
                  : ""}
              </p>
              {inviteEmailError ? <p className="text-xs text-destructive">{inviteEmailError}</p> : null}
            </div>
          )}

          {wasSuperAdmin && (
            <div className="rounded-md border border-border bg-muted/30 p-4 space-y-3">
              <p className="text-sm font-medium">Super administrator</p>
              <p className="text-xs text-muted-foreground">
                This account has full access and does not use a permission profile.
              </p>
              {actorIsSuper && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="convert-super"
                      checked={convertFromSuper}
                      disabled={id === selfId}
                      onCheckedChange={(c) => setConvertFromSuper(c === true)}
                    />
                    <label htmlFor="convert-super" className="text-sm leading-snug cursor-pointer">
                      <span className="font-medium">Convert to profile-based account</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        Assign a permission profile.
                        {id === selfId ? " You cannot remove your own super access." : ""}
                      </span>
                    </label>
                  </div>
                  {convertFromSuper && (
                    <div className="space-y-2 pl-6">
                      <Label>Permission profile</Label>
                      <Select
                        value={roleProfileId}
                        onValueChange={(v) => {
                          setRoleProfileId(v);
                          const profile = profiles.find((p) => p.id === v);
                          const profileDefaultDesignation = profile?.defaultDesignation?.trim();
                          if (profileDefaultDesignation) setDesignation(profileDefaultDesignation);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a profile" />
                        </SelectTrigger>
                        <SelectContent>
                          {profiles.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                              {p.isSystem ? " (system)" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!wasSuperAdmin && (
            <>
              <div className="space-y-2 border-t border-border pt-4">
                <Label>Permission profile</Label>
                <p className="text-xs text-muted-foreground -mt-1">
                  Permissions come from this profile. Manage profiles under Settings → Permission profiles.
                </p>
                <Select
                  value={roleProfileId}
                  onValueChange={(v) => {
                    setRoleProfileId(v);
                    const profile = profiles.find((p) => p.id === v);
                    const profileDefaultDesignation = profile?.defaultDesignation?.trim();
                    if (profileDefaultDesignation) setDesignation(profileDefaultDesignation);
                    setPromoteToSuper(false);
                  }}
                  disabled={promoteToSuper}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                        {p.isSystem ? " (system)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {actorIsSuper && (
                <div className="flex items-start gap-2 border border-border rounded-md p-3">
                  <Checkbox
                    id="promote-super"
                    checked={promoteToSuper}
                    onCheckedChange={(c) => {
                      const on = c === true;
                      setPromoteToSuper(on);
                      if (on) setRoleProfileId("");
                    }}
                  />
                  <label htmlFor="promote-super" className="text-sm leading-snug cursor-pointer">
                    <span className="font-medium">Super administrator</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      Full access; clears the permission profile. Use sparingly.
                    </span>
                  </label>
                </div>
              )}
            </>
          )}

          {canAssignProjects && projects.length > 0 && (
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-sm font-medium">Transaction access</p>
              <div className="grid gap-2 sm:grid-cols-2 max-h-48 overflow-y-auto pr-1">
                {projects.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={projectPicked.has(p.id)} onCheckedChange={(c) => toggleProject(p.id, c === true)} />
                    <span className="truncate">{p.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-between gap-2 pt-2 border-t border-border">
            <Button variant="destructive" type="button" onClick={() => void onDeactivate()} disabled={saving || id === selfId}>
              Deactivate
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={goBack}>
                Cancel
              </Button>
              <Button onClick={() => void onSave()} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>

          {!getApiBaseUrl() && (
            <p className="text-xs text-muted-foreground">
              Set <Link to="/settings">VITE_API_URL</Link> to use this page.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
