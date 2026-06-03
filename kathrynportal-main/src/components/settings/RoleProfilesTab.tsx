import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { listPermissionCatalogFromApi, type PermissionRow } from "@/api/teamMembers";
import {
  createRoleProfileApi,
  deleteRoleProfileApi,
  getRoleProfileFromApi,
  listRoleProfilesFromApi,
  updateRoleProfileApi,
  type RoleProfileListItem,
} from "@/api/roleProfiles";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

function groupByModule(rows: PermissionRow[]): Record<string, PermissionRow[]> {
  return rows.reduce<Record<string, PermissionRow[]>>((acc, r) => {
    (acc[r.module] ??= []).push(r);
    return acc;
  }, {});
}

export default function RoleProfilesTab() {
  const [profiles, setProfiles] = useState<RoleProfileListItem[]>([]);
  const [catalog, setCatalog] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultDesignation, setDefaultDesignation] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const { confirm, ConfirmDialogHost } = useConfirmDialog();

  const load = useCallback(async () => {
    if (!getApiBaseUrl()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [p, c] = await Promise.all([listRoleProfilesFromApi(), listPermissionCatalogFromApi()]);
      setProfiles(p);
      setCatalog(c);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load roles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => groupByModule(catalog), [catalog]);

  const openCreate = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setDefaultDesignation("");
    setSelectedKeys(new Set());
    setDialogOpen(true);
  };

  const openEdit = async (id: string) => {
    if (!getApiBaseUrl()) return;
    try {
      const p = await getRoleProfileFromApi(id);
      setEditingId(id);
      setName(p.name);
      setDescription(p.description ?? "");
      setDefaultDesignation(p.defaultDesignation ?? "");
      setSelectedKeys(new Set(p.permissionKeys));
      setDialogOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load profile.");
    }
  };

  const toggleKey = (key: string, on: boolean) => {
    setSelectedKeys((prev) => {
      const n = new Set(prev);
      if (on) n.add(key);
      else n.delete(key);
      return n;
    });
  };

  const onSaveDialog = async () => {
    if (!getApiBaseUrl()) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Name is required.");
      return;
    }
    if (selectedKeys.size === 0) {
      toast.error("Select at least one permission.");
      return;
    }
    setSaving(true);
    try {
      const keys = [...selectedKeys];
      if (editingId) {
        await updateRoleProfileApi(editingId, {
          name: trimmed,
          description: description.trim() || null,
          defaultDesignation: defaultDesignation.trim() || null,
          permissionKeys: keys,
        });
        toast.success("Role profile updated.");
      } else {
        await createRoleProfileApi({
          name: trimmed,
          description: description.trim() || null,
          defaultDesignation: defaultDesignation.trim() || null,
          permissionKeys: keys,
        });
        toast.success("Role profile created.");
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string, isSystem: boolean) => {
    if (isSystem) {
      toast.error("System profiles cannot be deleted.");
      return;
    }
    if (!getApiBaseUrl()) return;
    if (
      !(await confirm({
        title: "Delete permission profile",
        description: "Delete this permission profile? Users assigned to it must be moved first.",
        confirmLabel: "Delete",
      }))
    ) {
      return;
    }
    try {
      await deleteRoleProfileApi(id);
      toast.success("Profile removed.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed.");
    }
  };

  if (!getApiBaseUrl()) {
    return <p className="text-sm text-muted-foreground">Set VITE_API_URL to manage permission profiles.</p>;
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={openCreate}>
          New profile
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Named permission bundles. Assign a profile when creating or editing team members.
      </p>
      <div className="space-y-2">
        {profiles.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">{p.name}</p>
              {p.description && <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>}
              {p.defaultDesignation && (
                <p className="text-xs text-muted-foreground mt-1">Default designation: {p.defaultDesignation}</p>
              )}
              {p.isSystem && <p className="text-xs text-muted-foreground mt-1">System default</p>}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => void openEdit(p.id)}>
                Edit
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={p.isSystem}
                onClick={() => void onDelete(p.id, p.isSystem)}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit profile" : "New profile"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Junior coordinator" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label>Default designation</Label>
              <Input
                value={defaultDesignation}
                onChange={(e) => setDefaultDesignation(e.target.value)}
                placeholder="Optional; pre-fills team member designation"
              />
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1 border border-border rounded-md p-3">
                {Object.entries(grouped).map(([mod, rows]) => (
                  <div key={mod} className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{mod}</p>
                    <div className="grid gap-2 sm:grid-cols-1">
                      {rows.map((row) => (
                        <label key={row.key} className="flex items-start gap-2 text-sm">
                          <Checkbox checked={selectedKeys.has(row.key)} onCheckedChange={(c) => toggleKey(row.key, c === true)} />
                          <span>
                            <span className="font-mono text-xs text-muted-foreground">{row.key}</span>
                            <span className="block text-muted-foreground text-xs">{row.description}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void onSaveDialog()} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialogHost />
    </div>
  );
}
