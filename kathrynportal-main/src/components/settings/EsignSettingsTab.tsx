import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { uploadProjectStoredFile } from "@/api/storedFiles";
import { getEsignSettingsFromApi, saveEsignSettingsToApi, type EsignSettingsDto } from "@/api/esignSettings";

const CRM_VAULT_SLUG = "crm-doc-vault";

export default function EsignSettingsTab() {
  const api = Boolean(getApiBaseUrl());
  const sessionEmail = useAuthStore((s) => s.user?.email?.trim() ?? "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<EsignSettingsDto | null>(null);
  const [vendorName, setVendorName] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [signatureFileId, setSignatureFileId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const s = await getEsignSettingsFromApi();
      setSettings(s);
      setVendorName(s.vendorName ?? "");
      setVendorEmail(s.vendorEmail ?? "");
      setSignatureFileId(s.vendorSignatureFileId ?? null);
      if (!s.vendorEmail?.trim() && sessionEmail) {
        setVendorEmail(sessionEmail);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load eSign settings.");
    } finally {
      setLoading(false);
    }
  }, [api, sessionEmail]);

  useEffect(() => {
    void load();
  }, [load]);

  const signatureHint = useMemo(() => {
    if (!signatureFileId) return "No signature uploaded yet.";
    return `Signature file id: ${signatureFileId}`;
  }, [signatureFileId]);

  const onPickSignature = async (file: File | null) => {
    if (!file) return;
    if (!api) {
      toast.error("API is not configured.");
      return;
    }
    const type = (file.type ?? "").toLowerCase();
    const name = (file.name ?? "").toLowerCase();
    const isPng = type.includes("png") || name.endsWith(".png");
    if (!isPng) {
      toast.error("Please upload a PNG signature image.");
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadProjectStoredFile(CRM_VAULT_SLUG, file, null);
      setSignatureFileId(uploaded.id);
      toast.success("Signature uploaded.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Signature upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!api) return;
    if (!vendorEmail.trim()) {
      toast.error("Vendor email is required.");
      return;
    }
    if (!signatureFileId) {
      toast.error("Upload a vendor signature PNG first.");
      return;
    }
    setSaving(true);
    try {
      const s = await saveEsignSettingsToApi({
        vendorName: vendorName.trim(),
        vendorEmail: vendorEmail.trim(),
        vendorSignatureFileId: signatureFileId,
      });
      setSettings(s);
      toast.success("eSign settings saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (!api) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        Set <code className="px-1 py-0.5 bg-muted rounded">VITE_API_URL</code> to manage eSign settings.
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Default Vendor Signer</h3>
          <p className="text-xs text-muted-foreground">
            Used for the vendor signature role on all templates. Client recipients are resolved when sending from a transaction.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Vendor name</div>
              <Input value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="Company / signer name" />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Vendor email</div>
              <Input value={vendorEmail} onChange={(e) => setVendorEmail(e.target.value)} placeholder="company@example.com" />
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-6 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Vendor signature (PNG)</h3>
            <p className="text-xs text-muted-foreground">{signatureHint}</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center">
              <input
                type="file"
                accept="image/png"
                className="hidden"
                onChange={(e) => void onPickSignature(e.target.files?.[0] ?? null)}
              />
              <Button type="button" variant="outline" disabled={uploading}>
                <Upload className="w-4 h-4 mr-1" /> {uploading ? "Uploading..." : "Upload PNG"}
              </Button>
            </label>
            <Button type="button" onClick={handleSave} disabled={saving || loading}>
              {saving ? "Saving..." : "Save settings"}
            </Button>
          </div>
        </div>
        {settings?.updatedAt ? (
          <div className="text-xs text-muted-foreground">Last updated: {new Date(settings.updatedAt).toLocaleString()}</div>
        ) : null}
      </div>
    </motion.div>
  );
}

