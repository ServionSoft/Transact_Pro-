import { useCallback, useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Phone, Building, MapPin, Edit, FolderKanban, Trash2 } from "lucide-react";
import { archiveClientApi, getClientFromApi, permanentlyDeleteClientApi } from "@/api/clients";
import {
  listProjectsFromApi,
  permanentlyDeleteArchivedProjectApi,
  restoreProjectApi,
  type ProjectListItem,
} from "@/api/projects";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { hasPermission } from "@/lib/permissions";
import { useAppStore } from "@/store/appStore";
import { useAuthStore } from "@/store/authStore";
import { isTransactionProject } from "@/data/mockData";
import { toast } from "sonner";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const client = useAppStore((s) => s.clients.find((c) => c.id === id));
  const upsertClient = useAppStore((s) => s.upsertClient);
  const projects = useAppStore((s) => s.projects);
  const removeClientFromList = useAppStore((s) => s.removeClientFromList);
  const deleteClient = useAppStore((s) => s.deleteClient);
  const [loading, setLoading] = useState(!client && Boolean(getApiBaseUrl()) && Boolean(id));
  const [linkedApiProjects, setLinkedApiProjects] = useState<ProjectListItem[]>([]);
  const [archivedApiProjects, setArchivedApiProjects] = useState<ProjectListItem[]>([]);
  const [linkedProjectsLoading, setLinkedProjectsLoading] = useState(false);
  const [archivedActionId, setArchivedActionId] = useState<string | null>(null);
  const { confirm, ConfirmDialogHost } = useConfirmDialog();

  useEffect(() => {
    if (!id || client || !getApiBaseUrl()) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const row = await getClientFromApi(id);
        if (!cancelled) upsertClient(row);
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "Could not load contact.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, client, upsertClient]);

  const apiOn = Boolean(getApiBaseUrl());

  const refreshLinkedProjects = useCallback(async () => {
    if (!apiOn || !id) return;
    setLinkedProjectsLoading(true);
    try {
      const [active, archived] = await Promise.all([
        listProjectsFromApi({ clientId: id }),
        listProjectsFromApi({ clientId: id, archived: true }),
      ]);
      setLinkedApiProjects(active);
      setArchivedApiProjects(archived);
    } catch {
      setLinkedApiProjects([]);
      setArchivedApiProjects([]);
      toast.error("Could not load linked transactions.");
    } finally {
      setLinkedProjectsLoading(false);
    }
  }, [apiOn, id]);

  useEffect(() => {
    void refreshLinkedProjects();
  }, [refreshLinkedProjects]);

  if (loading) {
    return (
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col p-6 sm:p-8">
        <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          Loading contact...
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6 text-center sm:p-8">
        <p className="text-muted-foreground">Contact not found.</p>
        <Button variant="outline" onClick={() => navigate("/clients")} className="mt-4">Back to Contacts</Button>
      </div>
    );
  }

  const clientProjects = projects.filter(
    (p) => p.clientId === client.id && isTransactionProject(p)
  );

  const linkedProjects = (apiOn ? linkedApiProjects : clientProjects).filter(
    (p) => p.type === "Listing" || p.type === "Buyer File",
  );
  const archivedProjects = apiOn
    ? archivedApiProjects.filter((p) => p.type === "Listing" || p.type === "Buyer File")
    : [];
  const linkedProjectCount = linkedProjects.length;
  const archivedProjectCount = archivedProjects.length;
  const activeLinkCount = Math.max(linkedProjectCount, client.projectCount ?? 0);
  const canEditClient = !apiOn || hasPermission(user, "clients.edit");
  const canArchiveClient = !apiOn || hasPermission(user, "clients.archive");
  const canDeletePermanent = !apiOn || hasPermission(user, "clients.delete_permanent");
  const canManageProjects = !apiOn || hasPermission(user, "projects.delete");
  const canRestoreProjects = !apiOn || hasPermission(user, "projects.edit");
  const archiveBlocked = apiOn && activeLinkCount > 0;
  const permanentDeleteBlocked = apiOn && (activeLinkCount > 0 || archivedProjectCount > 0);

  const handleRestoreArchived = async (projectId: string) => {
    if (
      !(await confirm({
        title: "Restore transaction",
        description: "Restore this transaction to the active list?",
        confirmLabel: "Restore",
        destructive: false,
      }))
    ) {
      return;
    }
    setArchivedActionId(projectId);
    try {
      await restoreProjectApi(projectId);
      toast.success("Transaction restored.");
      await refreshLinkedProjects();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not restore transaction.");
    } finally {
      setArchivedActionId(null);
    }
  };

  const handlePurgeArchived = async (projectId: string, label: string) => {
    if (
      !(await confirm({
        title: "Remove archived transaction",
        description: `Permanently remove archived transaction "${label}"? This cannot be undone and is required before deleting the contact.`,
        confirmLabel: "Remove permanently",
      }))
    ) {
      return;
    }
    setArchivedActionId(projectId);
    try {
      await permanentlyDeleteArchivedProjectApi(projectId);
      toast.success("Archived transaction removed.");
      await refreshLinkedProjects();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove archived transaction.");
    } finally {
      setArchivedActionId(null);
    }
  };

  return (
    <div className="page-padding mx-auto flex w-full max-w-5xl flex-col gap-6 pb-8">
      <button onClick={() => navigate("/clients")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Contacts
      </button>

      <PageHeader
        title={client.name}
        subtitle={`${client.company} • ${client.role}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate(`/email?to=${client.email}`)} className="gap-2">
              <Mail className="w-4 h-4" /> Email
            </Button>
            {canEditClient && (
              <Button variant="outline" className="gap-2" onClick={() => navigate(`/clients/${client.id}/edit`)}>
                <Edit className="w-4 h-4" /> Edit
              </Button>
            )}
            <Button
              variant="outline"
              className="gap-2 text-destructive hover:text-destructive"
              disabled={(apiOn && !canArchiveClient) || archiveBlocked}
              title={
                archiveBlocked
                  ? "Reassign or archive linked transactions before archiving this contact."
                  : undefined
              }
              onClick={async () => {
                if (apiOn && !canArchiveClient) {
                  toast.error("You do not have permission to archive contacts.");
                  return;
                }
                if (archiveBlocked) {
                  toast.error(
                    "This contact is linked to active transactions. Reassign the primary contact or archive those transactions first."
                  );
                  return;
                }
                if (apiOn) {
                  if (
                    !(await confirm({
                      title: "Archive contact",
                      description: "Archive this contact? It will be hidden from the active contact list.",
                      confirmLabel: "Archive",
                    }))
                  ) {
                    return;
                  }
                  try {
                    await archiveClientApi(client.id);
                    removeClientFromList(client.id);
                    toast.success("Contact archived.");
                    navigate("/clients");
                    return;
                  } catch (err) {
                    const message = err instanceof Error ? err.message : "Could not archive contact.";
                    toast.error(message);
                  }
                  return;
                }

                if (
                  await confirm({
                    title: "Delete contact",
                    description: `Delete ${client.name}? This will also remove their transactions.`,
                    confirmLabel: "Delete",
                  })
                ) {
                  deleteClient(client.id);
                  toast.success("Contact deleted");
                  navigate("/clients");
                }
              }}
            >
              <Trash2 className="w-4 h-4" /> {getApiBaseUrl() ? "Archive" : "Delete"}
            </Button>
            {getApiBaseUrl() && canDeletePermanent && (
              <Button
                variant="outline"
                className="gap-2 text-destructive hover:text-destructive"
                disabled={permanentDeleteBlocked}
                title={
                  permanentDeleteBlocked
                    ? archivedProjectCount > 0
                      ? "Remove archived transactions below before permanently deleting this contact."
                      : "Archive or reassign active transactions first."
                    : undefined
                }
                onClick={async () => {
                  if (activeLinkCount > 0) {
                    toast.error("This contact has active transactions. Archive or reassign those first.");
                    return;
                  }
                  if (archivedProjectCount > 0) {
                    toast.error(
                      "Remove archived transactions in the section below before permanently deleting this contact."
                    );
                    return;
                  }
                  if (
                    !(await confirm({
                      title: "Delete contact permanently",
                      description: "Permanently delete this contact? This cannot be undone.",
                      confirmLabel: "Delete permanently",
                    }))
                  ) {
                    return;
                  }
                  try {
                    await permanentlyDeleteClientApi(client.id);
                    removeClientFromList(client.id);
                    toast.success("Contact permanently deleted.");
                    navigate("/clients");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Could not permanently delete contact.");
                  }
                }}
              >
                <Trash2 className="w-4 h-4" /> Delete Permanently
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Contact Info Card */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Contact Information</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm text-foreground">{client.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm text-foreground">{client.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Building className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Company</p>
                <p className="text-sm text-foreground">{client.company}</p>
              </div>
            </div>
            {client.propertyAddress && (
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Primary Address</p>
                  <p className="text-sm text-foreground">{client.propertyAddress}, {client.city}, {client.state} {client.zip}</p>
                </div>
              </div>
            )}
          </div>
          <div className="mt-5 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <StatusBadge status={client.status} type="client" />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-muted-foreground">Added</span>
              <span className="text-sm text-foreground">{client.createdAt}</span>
            </div>
          </div>
        </div>

        {/* Notes & transactions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Notes */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-display font-semibold text-foreground mb-3">Notes</h3>
            <p className="text-sm text-muted-foreground">{client.notes || "No notes yet."}</p>
          </div>

          {/* Linked transactions */}
          <div className="bg-card border border-border rounded-lg">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-display font-semibold text-foreground">
                <FolderKanban className="w-4 h-4 inline mr-2" />
                Linked transactions ({linkedProjectCount})
              </h3>
              <Button size="sm" onClick={() => navigate(`/projects/new?clientId=${encodeURIComponent(client.id)}`)}>
                New transaction
              </Button>
            </div>
            {linkedProjectsLoading ? (
              <div className="px-6 py-8 text-center text-muted-foreground text-sm">Loading transactions…</div>
            ) : linkedProjectCount > 0 ? (
              <div className="divide-y divide-border">
                {linkedProjects.map((p) => (
                  <Link
                    key={p.id}
                    to={`/projects/${p.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-secondary/30 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {(p.propertyAddress || "").split(",")[0] || p.name || "Transaction"}
                      </p>
                      <p className="text-xs text-muted-foreground">{p.type}</p>
                    </div>
                    <StatusBadge status={p.stage} type="stage" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="px-6 py-8 text-center text-muted-foreground text-sm">No active transactions linked.</div>
            )}
          </div>

          {apiOn && archivedProjectCount > 0 ? (
            <div className="bg-card border border-border rounded-lg border-amber-500/30">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="font-display font-semibold text-foreground">
                  Archived transactions ({archivedProjectCount})
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  These were deleted from the Transactions list but still block permanent contact deletion. Restore them
                  or remove them permanently.
                </p>
              </div>
              <div className="divide-y divide-border">
                {archivedProjects.map((p) => {
                  const label = (p.propertyAddress || "").split(",")[0] || p.name || "Transaction";
                  const busy = archivedActionId === p.id;
                  return (
                    <div key={p.id} className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{label}</p>
                        <p className="text-xs text-muted-foreground">{p.type}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {canRestoreProjects ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => void handleRestoreArchived(p.id)}
                          >
                            Restore
                          </Button>
                        ) : null}
                        {canManageProjects ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            disabled={busy}
                            onClick={() => void handlePurgeArchived(p.id, label)}
                          >
                            Remove permanently
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <ConfirmDialogHost />
    </div>
  );
}
