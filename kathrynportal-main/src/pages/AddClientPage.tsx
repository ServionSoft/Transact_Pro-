import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { createClientApi, type ClientUpsertBody } from "@/api/clients";
import ClientForm, { type ClientFormValues } from "@/components/clients/ClientForm";
import PageHeader from "@/components/shared/PageHeader";
import { toast } from "sonner";
import { useAppStore } from "@/store/appStore";
import { getApiBaseUrl } from "@/lib/apiConfig";

export default function AddClientPage() {
  const navigate = useNavigate();
  const addClient = useAppStore((s) => s.addClient);
  const upsertClient = useAppStore((s) => s.upsertClient);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<ClientFormValues>({
    name: "",
    email: "",
    phone: "",
    company: "",
    role: "Listing Agent",
    propertyAddress: "",
    city: "",
    state: "CA",
    zip: "",
    notes: "",
    status: "Active",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required.");
      return;
    }
    setIsSubmitting(true);
    try {
      if (getApiBaseUrl()) {
        const body: ClientUpsertBody = { ...form };
        const created = await createClientApi(body);
        upsertClient(created);
        toast.success("Client created successfully!", { description: `${created.name} has been added.` });
        navigate(`/clients/${created.id}`);
        return;
      }
      const created = addClient(form);
      toast.success("Client created successfully!", { description: `${created.name} has been added.` });
      navigate(`/clients/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create client.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const update = <K extends keyof ClientFormValues>(field: K, value: ClientFormValues[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <button onClick={() => navigate("/clients")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Clients
      </button>
      <PageHeader title="Add New Client" subtitle="Enter the client's contact details and primary address." />

      <ClientForm
        values={form}
        isSubmitting={isSubmitting}
        submitLabel="Save Client"
        onSubmit={handleSubmit}
        onChange={update}
        onCancel={() => navigate("/clients")}
      />
    </div>
  );
}
