import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { getClientFromApi, updateClientApi, type ClientUpsertBody } from "@/api/clients";
import ClientForm, { type ClientFormValues } from "@/components/clients/ClientForm";
import PageHeader from "@/components/shared/PageHeader";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { hasPermission } from "@/lib/permissions";
import { useAppStore } from "@/store/appStore";
import { useAuthStore } from "@/store/authStore";

function toFormValues(client: {
  name: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  status: "Active" | "Inactive" | "Prospect";
  propertyAddress: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
}): ClientFormValues {
  return {
    name: client.name,
    email: client.email,
    phone: client.phone,
    company: client.company,
    role: client.role,
    status: client.status,
    propertyAddress: client.propertyAddress,
    city: client.city,
    state: client.state,
    zip: client.zip,
    notes: client.notes,
  };
}

export default function EditClientPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const user = useAuthStore((s) => s.user);
  const storeClient = useAppStore((s) => s.clients.find((c) => c.id === id));
  const updateClientLocal = useAppStore((s) => s.updateClient);
  const upsertClient = useAppStore((s) => s.upsertClient);

  const [form, setForm] = useState<ClientFormValues>(() =>
    storeClient
      ? toFormValues(storeClient)
      : {
          name: "",
          email: "",
          phone: "",
          company: "",
          role: "Listing Agent",
          status: "Active",
          propertyAddress: "",
          city: "",
          state: "CA",
          zip: "",
          notes: "",
        }
  );
  const [loading, setLoading] = useState(!storeClient && Boolean(getApiBaseUrl()));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id || !getApiBaseUrl()) return;
    if (!hasPermission(user, "clients.edit")) {
      toast.error("You do not have permission to edit clients.");
      navigate(`/clients/${id}`, { replace: true });
      return;
    }
    if (storeClient) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const client = await getClientFromApi(id);
        if (!cancelled) {
          upsertClient(client);
          setForm(toFormValues(client));
        }
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Could not load client.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, storeClient, upsertClient, user, navigate]);

  if (!id) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Invalid client id.
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (getApiBaseUrl() && !hasPermission(user, "clients.edit")) {
      toast.error("You do not have permission to edit clients.");
      navigate(`/clients/${id}`);
      return;
    }
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required.");
      return;
    }
    setIsSubmitting(true);
    try {
      if (getApiBaseUrl()) {
        const body: ClientUpsertBody = { ...form };
        const updated = await updateClientApi(id, body);
        upsertClient(updated);
        toast.success("Client updated.");
        navigate(`/clients/${updated.id}`);
        return;
      }
      updateClientLocal(id, form);
      toast.success("Client updated.");
      navigate(`/clients/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update client.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onChange = <K extends keyof ClientFormValues>(field: K, value: ClientFormValues[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <button
        onClick={() => navigate(id ? `/clients/${id}` : "/clients")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Client
      </button>
      <PageHeader title="Edit Client" subtitle="Update contact details and primary address." />

      {loading ? (
        <div className="bg-card border border-border rounded-lg p-6 text-sm text-muted-foreground">
          Loading client...
        </div>
      ) : (
        <ClientForm
          values={form}
          isSubmitting={isSubmitting}
          submitLabel="Update Client"
          onSubmit={handleSubmit}
          onChange={onChange}
          onCancel={() => navigate(`/clients/${id}`)}
        />
      )}
    </div>
  );
}
