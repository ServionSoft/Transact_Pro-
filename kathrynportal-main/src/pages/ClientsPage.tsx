import { Link, useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { listClientsFromApi, unarchiveClientApi } from "@/api/clients";
import { useAppStore } from "@/store/appStore";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { hasPermission } from "@/lib/permissions";
import { useAuthStore } from "@/store/authStore";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [showArchived, setShowArchived] = useState(false);
  /** When API is on, start loading so we never flash an empty count before the first fetch. */
  const [loading, setLoading] = useState(() => Boolean(getApiBaseUrl()));
  const [loadError, setLoadError] = useState<string | null>(null);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clients = useAppStore((s) => s.clients);
  const setClients = useAppStore((s) => s.setClients);

  const refresh = useCallback(async () => {
    if (!getApiBaseUrl()) return;
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await listClientsFromApi({ archived: showArchived });
      setClients(rows);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not load contacts.";
      setLoadError(msg);
      toast.error("Could not load contacts", { description: msg });
    } finally {
      setLoading(false);
    }
  }, [setClients, showArchived]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const apiOn = Boolean(getApiBaseUrl());
  const canCreate = !apiOn || hasPermission(user, "clients.create");
  const canArchive = !apiOn || hasPermission(user, "clients.archive");

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    const pref = (c.preferredName ?? "").toLowerCase();
    const matchSearch =
      c.name.toLowerCase().includes(q) ||
      pref.includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q) ||
      c.propertyAddress.toLowerCase().includes(q);
    const matchStatus = showArchived || filterStatus === "All" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Contacts"
        subtitle={loading ? "Loading..." : `${clients.length} ${showArchived ? "archived" : "total"} contacts`}
        actions={
          canCreate ? (
            <Button onClick={() => navigate("/clients/new")} className="gap-2" disabled={showArchived}>
              <Plus className="w-4 h-4" /> Add contact
            </Button>
          ) : undefined
        }
      />

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {["All", "Active", "Inactive", "Prospect"].map(s => (
            <button
              key={s}
              disabled={showArchived}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-muted"
              } ${showArchived ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {s}
            </button>
          ))}
          <button
            onClick={() => {
              setShowArchived((prev) => !prev);
              setFilterStatus("All");
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              showArchived
                ? "bg-destructive text-destructive-foreground border border-destructive/80"
                : "bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/15"
            }`}
          >
            Archived
          </button>
        </div>
      </div>

      {showArchived && (
        <p className="text-xs text-muted-foreground mb-3">
          Archived contacts are hidden from active workflows. Use restore to move them back.
        </p>
      )}

      {loadError && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          <p className="font-medium">Could not load contacts from API.</p>
          <p className="text-xs mt-1 text-muted-foreground">{loadError}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => void refresh()}>
            Retry
          </Button>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Company</th>
              <th className="px-6 py-3 font-medium">Role</th>
              <th className="px-6 py-3 font-medium">Phone</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Transactions</th>
              <th className="px-6 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((client, i) => (
              <motion.tr
                key={client.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="hover:bg-secondary/30 transition-colors"
              >
                <td className="px-6 py-3.5">
                  <Link to={`/clients/${client.id}`} className="text-sm font-medium text-foreground hover:text-accent">
                    {client.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{client.email}</p>
                </td>
                <td className="px-6 py-3.5 text-sm text-muted-foreground">{client.company}</td>
                <td className="px-6 py-3.5 text-sm text-muted-foreground">{client.role}</td>
                <td className="px-6 py-3.5 text-sm text-muted-foreground">{client.phone}</td>
                <td className="px-6 py-3.5"><StatusBadge status={client.status} type="client" /></td>
                <td className="px-6 py-3.5 text-sm text-foreground font-medium">{client.projectCount}</td>
                <td className="px-6 py-3.5">
                  {showArchived ? (
                    <button
                      type="button"
                      className={`text-sm ${canArchive ? "text-accent hover:underline" : "text-muted-foreground cursor-not-allowed"}`}
                      disabled={!canArchive}
                      onClick={async () => {
                        if (!canArchive) {
                          toast.error("You do not have permission to restore contacts.");
                          return;
                        }
                        try {
                          await unarchiveClientApi(client.id);
                          toast.success("Contact restored.");
                          void refresh();
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Could not restore client.");
                        }
                      }}
                    >
                      Restore
                    </button>
                  ) : (
                    <Link to={`/clients/${client.id}`} className="text-accent hover:underline text-sm">View</Link>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="px-6 py-12 text-center text-muted-foreground text-sm">
            {showArchived ? "No archived contacts found." : "No contacts found."}
          </div>
        )}
      </div>
    </div>
  );
}
