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
  preferredName?: string;
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
  assistantContactId?: string;
}): ClientFormValues {
  return {
    name: client.name,
    preferredName: client.preferredName ?? "",
    email: client.email,
    phone: client.phone,
    company: client.company,
    role: client.role?.trim() || "Other",
    status: client.status,
    propertyAddress: client.propertyAddress,
    city: client.city,
    state: client.state,
    zip: client.zip,
    notes: client.notes,
    assistantContactId: client.assistantContactId ?? "",
  };
}

export default function EditClientPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const user = useAuthStore((s) => s.user);
  const storeClient = useAppStore((s) => s.clients.find((c) => c.id === id));
  const contactOptions = useAppStore((s) => s.clients);
  const updateClientLocal = useAppStore((s) => s.updateClient);
  const upsertClient = useAppStore((s) => s.upsertClient);

  const [form, setForm] = useState<ClientFormValues>(() =>
    storeClient
      ? toFormValues(storeClient)
      : {
          name: "",
          preferredName: "",
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
          assistantContactId: "",
        }
  );
  const [loading, setLoading] = useState(!storeClient && Boolean(getApiBaseUrl()));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id || !getApiBaseUrl()) return;
    if (!hasPermission(user, "clients.edit")) {
      toast.error("You do not have permission to edit contacts.");
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
          toast.error(e instanceof Error ? e.message : "Could not load contact.");
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
      <div className="p-6 text-center text-muted-foreground sm:p-8">
        Invalid contact id.
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (getApiBaseUrl() && !hasPermission(user, "clients.edit")) {
      toast.error("You do not have permission to edit contacts.");
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
        toast.success("Contact updated.");
        navigate(`/clients/${updated.id}`);
        return;
      }
      updateClientLocal(id, form);
      toast.success("Contact updated.");
      navigate(`/clients/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update contact.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onChange = <K extends keyof ClientFormValues>(field: K, value: ClientFormValues[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="page-padding mx-auto flex w-full max-w-3xl flex-col pb-8">
      <button
        onClick={() => navigate(id ? `/clients/${id}` : "/clients")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to contact
      </button>
      <PageHeader title="Edit contact" subtitle="Update contact details and primary address." />

      {loading ? (
        <div className="bg-card border border-border rounded-lg p-6 text-sm text-muted-foreground">
          Loading contact...
        </div>
      ) : (
        <ClientForm
          values={form}
          contactOptions={contactOptions}
          excludeContactId={id}
          isSubmitting={isSubmitting}
          submitLabel="Save changes"
          onSubmit={handleSubmit}
          onChange={onChange}
          onCancel={() => navigate(`/clients/${id}`)}
        />
      )}
    </div>
  );
}
