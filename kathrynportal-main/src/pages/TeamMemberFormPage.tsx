import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { createTeamMemberApi, inviteTeamMemberApi, listProjectsPickerFromApi } from "@/api/teamMembers";
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

export default function TeamMemberFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "invite" ? "invite" : "create";
  const actor = useAuthStore((s) => s.user);

  const canAssignProjects = useMemo(
    () => actor?.role === "super_admin" || actor?.permissions?.includes("team_members.assign_projects"),
    [actor]
  );
  const canCreateSuperAdmin = actor?.role === "super_admin";

  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [designationOptions, setDesignationOptions] = useState<string[]>([...DEFAULT_DESIGNATIONS]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profiles, setProfiles] = useState<RoleProfileListItem[]>([]);
  const [roleProfileId, setRoleProfileId] = useState("");
  const [createSuperAdmin, setCreateSuperAdmin] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [projectPicked, setProjectPicked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!getApiBaseUrl()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [profRows, projs] = await Promise.all([listRoleProfilesFromApi(), listProjectsPickerFromApi()]);
        if (!cancelled) {
          const merged = [...DEFAULT_DESIGNATIONS];
          for (const row of profRows) {
            const trimmed = (row.defaultDesignation ?? "").trim();
            if (trimmed && !merged.some((x) => x.toLowerCase() === trimmed.toLowerCase())) merged.push(trimmed);
          }
          setDesignationOptions(merged);
          setProfiles(profRows);
          setProjects(projs);
          if (profRows.length && !roleProfileId) {
            setRoleProfileId(profRows[0]!.id);
            const defaultDesignation = profRows[0]!.defaultDesignation?.trim();
            if (defaultDesignation) setDesignation(defaultDesignation);
          }
        }
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Could not load form data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial default only
  }, []);

  useEffect(() => {
    if (createSuperAdmin) return;
    if (!roleProfileId && profiles.length > 0) {
      setRoleProfileId(profiles[0]!.id);
    }
  }, [createSuperAdmin, profiles, roleProfileId]);

  useEffect(() => {
    if (createSuperAdmin) return;
    const profile = profiles.find((p) => p.id === roleProfileId);
    const defaultDesignation = profile?.defaultDesignation?.trim();
    if (defaultDesignation && !designation.trim()) {
      setDesignation(defaultDesignation);
    }
  }, [createSuperAdmin, profiles, roleProfileId, designation]);

  const toggleProject = (id: string, on: boolean) => {
    setProjectPicked((prev) => {
      const n = new Set(prev);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
  };

  const goBack = () => navigate("/settings", { replace: false, state: { activeTab: "team" } });

  const onSubmit = async () => {
    if (!getApiBaseUrl()) {
      toast.error("Set VITE_API_URL to use team management.");
      return;
    }
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required.");
      return;
    }
    if (mode === "create" && password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (!createSuperAdmin && !roleProfileId) {
      toast.error("Select a permission profile.");
      return;
    }
    setSaving(true);
    try {
      const projectIds = canAssignProjects ? [...projectPicked] : [];
      if (canCreateSuperAdmin && createSuperAdmin) {
        const base = {
          name: name.trim(),
          designation: designation.trim() || null,
          email: email.trim(),
          role: "super_admin" as const,
          permissionOverrides: [] as { key: string; allowed: boolean }[],
          projectIds,
        };
        if (mode === "invite") {
          const r = await inviteTeamMemberApi(base);
          if (r.inviteEmailStatus === "sent") {
            toast.success("Invitation created and invite email sent.", {
              description: r.inviteUrl ?? undefined,
            });
          } else {
            toast.warning("Invitation created; invite email was not delivered.", {
              description: [r.inviteEmailError, r.inviteUrl].filter(Boolean).join("\n\n") || undefined,
            });
          }
        } else {
          await createTeamMemberApi({
            ...base,
            password,
            status: "active",
          });
          toast.success("Member created.");
        }
      } else {
        const base = {
          name: name.trim(),
          designation: designation.trim() || null,
          email: email.trim(),
          roleProfileId,
          permissionOverrides: [] as { key: string; allowed: boolean }[],
          projectIds,
        };
        if (mode === "invite") {
          const r = await inviteTeamMemberApi(base);
          if (r.inviteEmailStatus === "sent") {
            toast.success("Invitation created and invite email sent.", {
              description: r.inviteUrl ?? undefined,
            });
          } else {
            toast.warning("Invitation created; invite email was not delivered.", {
              description: [r.inviteEmailError, r.inviteUrl].filter(Boolean).join("\n\n") || undefined,
            });
          }
        } else {
          await createTeamMemberApi({
            ...base,
            password,
            status: "active",
          });
          toast.success("Member created.");
        }
      }
      goBack();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={goBack}>
          ← Back
        </Button>
      </div>
      <PageHeader
        title={mode === "invite" ? "Invite team member" : "Create team member"}
        subtitle={
          mode === "invite"
            ? "Creates an invited user and sends an activation email from your configured SMTP mailbox when possible."
            : "Creates an active user with password."
        }
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-6 bg-card border border-border rounded-lg p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-2">
              <Label>Designation</Label>
              <Input
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Senior editor"
                list="designation-options-new"
              />
              <datalist id="designation-options-new">
                {designationOptions.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="space-y-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@company.com" />
            </div>
          </div>
          {mode === "create" && (
            <div className="space-y-2">
              <Label>Temporary password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" />
            </div>
          )}

          {canCreateSuperAdmin && (
            <div className="flex items-start gap-2 border border-border rounded-md p-3">
              <Checkbox
                id="sa-new"
                checked={createSuperAdmin}
                onCheckedChange={(c) => {
                  const on = c === true;
                  setCreateSuperAdmin(on);
                  if (on) setRoleProfileId("");
                }}
              />
              <label htmlFor="sa-new" className="text-sm leading-snug cursor-pointer">
                <span className="font-medium">Super administrator</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  Full access; does not use a permission profile. Use sparingly.
                </span>
              </label>
            </div>
          )}

          {!createSuperAdmin && (
            <div className="space-y-2 border-t border-border pt-4">
              <Label>Permission profile</Label>
              <p className="text-xs text-muted-foreground -mt-1">
                Permissions come from this profile. Manage profiles under Settings → Permission profiles.
              </p>
              <Select
                value={roleProfileId}
                onValueChange={(next) => {
                  setRoleProfileId(next);
                  const profile = profiles.find((p) => p.id === next);
                  const defaultDesignation = profile?.defaultDesignation?.trim();
                  if (defaultDesignation) setDesignation(defaultDesignation);
                }}
              >
                <SelectTrigger className="max-w-md">
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

          {canAssignProjects && projects.length > 0 && (
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-sm font-medium">Project assignments</p>
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

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={goBack}>
              Cancel
            </Button>
            <Button onClick={() => void onSubmit()} disabled={saving}>
              {saving ? "Saving…" : mode === "invite" ? "Send invitation" : "Create member"}
            </Button>
          </div>

          {!getApiBaseUrl() && (
            <p className="text-xs text-muted-foreground">API not configured. Set VITE_API_URL in the frontend env to enable this form.</p>
          )}
        </div>
      )}
    </div>
  );
}
