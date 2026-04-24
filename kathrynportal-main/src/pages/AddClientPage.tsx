import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import { toast } from "sonner";
import { useAppStore } from "@/store/appStore";
import type { ClientStatus } from "@/data/mockData";

export default function AddClientPage() {
  const navigate = useNavigate();
  const addClient = useAppStore((s) => s.addClient);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", company: "", role: "Listing Agent",
    propertyAddress: "", city: "", state: "CA", zip: "", notes: "", status: "Active" as ClientStatus,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error("Name and email are required.");
      return;
    }
    const created = addClient(form);
    toast.success("Client created successfully!", { description: `${created.name} has been added.` });
    navigate(`/clients/${created.id}`);
  };

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <button onClick={() => navigate("/clients")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Clients
      </button>
      <PageHeader title="Add New Client" subtitle="Enter the agent's contact details and property information." />

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input id="name" value={form.name} onChange={e => update("name", e.target.value)} placeholder="e.g. Sarah Mitchell" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="sarah@realty.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="(310) 555-0142" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input id="company" value={form.company} onChange={e => update("company", e.target.value)} placeholder="Pacific Coast Realty" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={form.role} onValueChange={v => update("role", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Listing Agent">Listing Agent</SelectItem>
                <SelectItem value="Buyer's Agent">Buyer's Agent</SelectItem>
                <SelectItem value="Dual Agent">Dual Agent</SelectItem>
                <SelectItem value="Escrow Officer">Escrow Officer</SelectItem>
                <SelectItem value="Lender">Lender</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={form.status} onValueChange={v => update("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="Prospect">Prospect</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border-t border-border pt-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Property Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="propertyAddress">Property Address</Label>
              <Input id="propertyAddress" value={form.propertyAddress} onChange={e => update("propertyAddress", e.target.value)} placeholder="1247 Ocean View Dr" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} onChange={e => update("city", e.target.value)} placeholder="Malibu" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" value={form.state} onChange={e => update("state", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP</Label>
                <Input id="zip" value={form.zip} onChange={e => update("zip", e.target.value)} placeholder="90265" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" value={form.notes} onChange={e => update("notes", e.target.value)} placeholder="Any notes about this client..." rows={3} />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={() => navigate("/clients")}>Cancel</Button>
          <Button type="submit">Save Client</Button>
        </div>
      </form>
    </div>
  );
}
