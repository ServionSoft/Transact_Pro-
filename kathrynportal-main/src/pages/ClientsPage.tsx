import { Link, useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { listClientsFromApi } from "@/api/clients";
import { useAppStore } from "@/store/appStore";
import { getApiBaseUrl } from "@/lib/apiConfig";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const navigate = useNavigate();
  const clients = useAppStore((s) => s.clients);
  const setClients = useAppStore((s) => s.setClients);

  const refresh = useCallback(async () => {
    if (!getApiBaseUrl()) return;
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await listClientsFromApi();
      setClients(rows);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not load clients.";
      setLoadError(msg);
      toast.error("Could not load clients", { description: msg });
    } finally {
      setLoading(false);
    }
  }, [setClients]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.propertyAddress.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Clients"
        subtitle={loading ? "Loading..." : `${clients.length} total clients`}
        actions={
          <Button onClick={() => navigate("/clients/new")} className="gap-2">
            <Plus className="w-4 h-4" /> Add Client
          </Button>
        }
      />

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {["All", "Active", "Inactive", "Prospect"].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-muted"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loadError && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          <p className="font-medium">Could not load clients from API.</p>
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
              <th className="px-6 py-3 font-medium">Projects</th>
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
                  <Link to={`/clients/${client.id}`} className="text-accent hover:underline text-sm">View</Link>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="px-6 py-12 text-center text-muted-foreground text-sm">No clients found.</div>
        )}
      </div>
    </div>
  );
}
