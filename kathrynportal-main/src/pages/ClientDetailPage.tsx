import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Phone, Building, MapPin, Edit, FolderKanban, Trash2 } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/appStore";
import { isTransactionProject } from "@/data/mockData";
import { toast } from "sonner";

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const client = useAppStore((s) => s.clients.find((c) => c.id === id));
  const projects = useAppStore((s) => s.projects);
  const deleteClient = useAppStore((s) => s.deleteClient);

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
            <Button
              variant="outline"
              className="gap-2 text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm(`Delete ${client.name}? This will also remove their projects.`)) {
                  deleteClient(client.id);
                  toast.success("Client deleted");
                  navigate("/clients");
                }
              }}
            >
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
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
                  <p className="text-xs text-muted-foreground">Address</p>
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
                Linked Projects ({clientProjects.length})
              </h3>
              <Button size="sm" onClick={() => navigate("/projects/new")}>New Project</Button>
            </div>
            {clientProjects.length > 0 ? (
              <div className="divide-y divide-border">
                {clientProjects.map(p => (
                  <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center justify-between px-6 py-4 hover:bg-secondary/30 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.propertyAddress.split(",")[0]}</p>
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
