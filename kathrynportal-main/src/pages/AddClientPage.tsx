import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { createClientApi, type ClientUpsertBody } from "@/api/clients";
import ClientForm, {
  buildClientDetails,
  emptyClientDetailFields,
  normalizeClientForm,
  type ClientFormValues,
} from "@/components/clients/ClientForm";
import PageHeader from "@/components/shared/PageHeader";
import { toast } from "sonner";
import { useAppStore } from "@/store/appStore";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { hasPermission } from "@/lib/permissions";
import { useAuthStore } from "@/store/authStore";

export default function AddClientPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const addClient = useAppStore((s) => s.addClient);
  const upsertClient = useAppStore((s) => s.upsertClient);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<ClientFormValues>({
    name: "",
    firstName: "",
    lastName: "",
    preferredName: "",
    email: "",
    phone: "",
    company: "",
    role: "Agent",
    propertyAddress: "",
    city: "",
    state: "CA",
    zip: "",
    notes: "",
    status: "Active",
    assistantContactId: "",
    ...emptyClientDetailFields,
  });
  const contactOptions = useAppStore((s) => s.clients);

  useEffect(() => {
    if (!getApiBaseUrl()) return;
    if (!hasPermission(user, "clients.create")) {
      toast.error("You do not have permission to create contacts.");
      navigate("/clients", { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (getApiBaseUrl() && !hasPermission(user, "clients.create")) {
      toast.error("You do not have permission to create contacts.");
      navigate("/clients");
      return;
    }
    if (!form.firstName.trim() || !form.lastName.trim() || !form.preferredName.trim()) {
      toast.error("First name, last name, and preferred name are required.");
      return;
    }
    const normalized = normalizeClientForm(form);
    setIsSubmitting(true);
    try {
      if (getApiBaseUrl()) {
        const body: ClientUpsertBody = { ...normalized, details: buildClientDetails(normalized) };
        const created = await createClientApi(body);
        upsertClient(created);
        toast.success("Contact created successfully!", { description: `${created.name} has been added.` });
        navigate(`/clients/${created.id}`);
        return;
      }
      const created = addClient({ ...normalized, details: buildClientDetails(normalized) });
      toast.success("Contact created successfully!", { description: `${created.name} has been added.` });
      navigate(`/clients/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create contact.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const update = <K extends keyof ClientFormValues>(field: K, value: ClientFormValues[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="page-padding mx-auto flex w-full max-w-3xl flex-col pb-8">
      <button onClick={() => navigate("/clients")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Contacts
      </button>
      <PageHeader title="Add contact" subtitle="Enter this person's details and primary address." />

      <ClientForm
        values={form}
        contactOptions={contactOptions}
        isSubmitting={isSubmitting}
        submitLabel="Save contact"
        onSubmit={handleSubmit}
        onChange={update}
        onCancel={() => navigate("/clients")}
      />
    </div>
  );
}
