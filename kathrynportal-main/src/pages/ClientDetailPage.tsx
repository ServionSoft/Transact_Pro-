import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Phone, Building, MapPin, Edit, FolderKanban, Trash2 } from "lucide-react";
import { archiveClientApi, getClientFromApi, permanentlyDeleteClientApi } from "@/api/clients";
import { listProjectsFromApi, type ProjectListItem } from "@/api/projects";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { hasPermission } from "@/lib/permissions";
import { useAppStore } from "@/store/appStore";
import { useAuthStore } from "@/store/authStore";
import { isTransactionProject } from "@/data/mockData";
import { toast } from "sonner";

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
  const [linkedProjectsLoading, setLinkedProjectsLoading] = useState(false);

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
          toast.error(err instanceof Error ? err.message : "Could not load client.");
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

  useEffect(() => {
    if (!apiOn || !id) return;
    let cancelled = false;
    setLinkedProjectsLoading(true);
    void listProjectsFromApi({ clientId: id })
      .then((rows) => {
        if (!cancelled) setLinkedApiProjects(rows);
      })
      .catch(() => {
        if (!cancelled) {
          setLinkedApiProjects([]);
          toast.error("Could not load linked projects.");
        }
      })
      .finally(() => {
        if (!cancelled) setLinkedProjectsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiOn, id]);

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="bg-card border border-border rounded-lg p-6 text-sm text-muted-foreground">
          Loading client...
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Client not found.</p>
        <Button variant="outline" onClick={() => navigate("/clients")} className="mt-4">Back to Clients</Button>
      </div>
    );
  }

  const clientProjects = projects.filter(
    (p) => p.clientId === client.id && isTransactionProject(p)
  );

  const linkedProjects = apiOn ? linkedApiProjects : clientProjects;
  const linkedProjectCount = linkedProjects.length;
  const canEditClient = !apiOn || hasPermission(user, "clients.edit");
  const canArchiveClient = !apiOn || hasPermission(user, "clients.archive");
  const canDeletePermanent = !apiOn || hasPermission(user, "clients.delete_permanent");

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <button onClick={() => navigate("/clients")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Clients
      </button>

      <PageHeader
        title={client.name}
        subtitle={`${client.company} • ${client.role}`}
        actions={
          <div className="flex gap-2">
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
              disabled={apiOn && !canArchiveClient}
              onClick={async () => {
                if (apiOn && !canArchiveClient) {
                  toast.error("You do not have permission to archive clients.");
                  return;
                }
                if (apiOn) {
                  const msg =
                    "Archive this client? It will be hidden from the client list but project history remains.";
                  if (!confirm(msg)) return;
                  try {
                    await archiveClientApi(client.id);
                    removeClientFromList(client.id);
                    toast.success("Client archived.");
                    navigate("/clients");
                    return;
                  } catch (err) {
                    const message = err instanceof Error ? err.message : "Could not archive client.";
                    toast.error(message);
                  }
                  return;
                }

                if (confirm(`Delete ${client.name}? This will also remove their projects.`)) {
                  deleteClient(client.id);
                  toast.success("Client deleted");
                  navigate("/clients");
                }
              }}
            >
              <Trash2 className="w-4 h-4" /> {getApiBaseUrl() ? "Archive" : "Delete"}
            </Button>
            {getApiBaseUrl() && linkedProjectCount === 0 && canDeletePermanent && (
              <Button
                variant="outline"
                className="gap-2 text-destructive hover:text-destructive"
                onClick={async () => {
                  if (linkedProjectCount > 0) {
                    toast.error("Client has linked projects. Delete or reassign those projects first.");
                    return;
                  }
                  if (!confirm("Permanently delete this client? This cannot be undone.")) return;
                  try {
                    await permanentlyDeleteClientApi(client.id);
                    removeClientFromList(client.id);
                    toast.success("Client permanently deleted.");
                    navigate("/clients");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Could not permanently delete client.");
                  }
                }}
              >
                <Trash2 className="w-4 h-4" /> Delete Permanently
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

        {/* Notes & Projects */}
        <div className="lg:col-span-2 space-y-6">
          {/* Notes */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-display font-semibold text-foreground mb-3">Notes</h3>
            <p className="text-sm text-muted-foreground">{client.notes || "No notes yet."}</p>
          </div>

          {/* Projects */}
          <div className="bg-card border border-border rounded-lg">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-display font-semibold text-foreground">
                <FolderKanban className="w-4 h-4 inline mr-2" />
                Linked Projects ({linkedProjectCount})
              </h3>
              <Button size="sm" onClick={() => navigate(`/projects/new?clientId=${encodeURIComponent(client.id)}`)}>
                New Project
              </Button>
            </div>
            {linkedProjectsLoading ? (
              <div className="px-6 py-8 text-center text-muted-foreground text-sm">Loading projects…</div>
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
                        {(p.propertyAddress || "").split(",")[0] || p.name || "Project"}
                      </p>
                      <p className="text-xs text-muted-foreground">{p.type}</p>
                    </div>
                    <StatusBadge status={p.stage} type="stage" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="px-6 py-8 text-center text-muted-foreground text-sm">No projects linked yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
