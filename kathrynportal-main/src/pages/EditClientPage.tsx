import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { getClientFromApi, updateClientApi, type ClientUpsertBody } from "@/api/clients";
import ClientForm, {
  buildClientDetails,
  detailsToFormValues,
  emptyClientDetailFields,
  normalizeClientForm,
  type ClientFormValues,
} from "@/components/clients/ClientForm";
import { normalizeContactRole } from "@/constants/contactRoles";
import type { ClientDetails } from "@/types/domain";
import PageHeader from "@/components/shared/PageHeader";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { hasPermission } from "@/lib/permissions";
import { useAppStore } from "@/store/appStore";
import { useAuthStore } from "@/store/authStore";

function splitName(fullName: string): { first: string; last: string } {
  const trimmed = fullName.trim();
  const spaceIdx = trimmed.indexOf(" ");
  if (spaceIdx === -1) return { first: trimmed, last: "" };
  return { first: trimmed.slice(0, spaceIdx), last: trimmed.slice(spaceIdx + 1).trim() };
}

function toFormValues(client: {
  name: string;
  firstName?: string;
  lastName?: string;
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
  details?: ClientDetails;
}): ClientFormValues {
  const fallback = splitName(client.name);
  return {
    name: client.name,
    firstName: client.firstName?.trim() || fallback.first,
    lastName: client.lastName?.trim() || fallback.last,
    preferredName: client.preferredName ?? "",
    email: client.email,
    phone: client.phone,
    company: client.company,
    role: normalizeContactRole(client.role) || "Other",
    status: client.status,
    propertyAddress: client.propertyAddress,
    city: client.city,
    state: client.state,
    zip: client.zip,
    notes: client.notes,
    assistantContactId: client.assistantContactId ?? "",
    ...detailsToFormValues(client.details),
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
          firstName: "",
          lastName: "",
          preferredName: "",
          email: "",
          phone: "",
          company: "",
          role: "Agent",
          status: "Active",
          propertyAddress: "",
          city: "",
          state: "CA",
          zip: "",
          notes: "",
          assistantContactId: "",
          ...emptyClientDetailFields,
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
    const isLender = form.role.trim().toLowerCase() === "lender";
    if (!form.firstName.trim() || !form.lastName.trim() || !form.preferredName.trim()) {
      toast.error("First name, last name, and preferred name are required.");
      return;
    }
    if (!isLender && !form.email.trim()) {
      toast.error("Email is required for this contact type.");
      return;
    }
    const normalized = normalizeClientForm(form);
    setIsSubmitting(true);
    try {
      if (getApiBaseUrl()) {
        const body: ClientUpsertBody = { ...normalized, details: buildClientDetails(normalized) };
        const updated = await updateClientApi(id, body);
        upsertClient(updated);
        toast.success("Contact updated.");
        navigate(`/clients/${updated.id}`);
        return;
      }
      updateClientLocal(id, { ...normalized, details: buildClientDetails(normalized) });
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
