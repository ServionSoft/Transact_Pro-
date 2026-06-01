import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { getApiBaseUrl } from "@/lib/apiConfig";
import {
  getDocusignConsentUrlFromApi,
  getDocusignSettingsFromApi,
  saveDocusignSettingsToApi,
  testDocusignConnectionFromApi,
  type DocusignSettingsDto,
} from "@/api/docusignSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const fieldInputClass = "min-w-0 w-full font-mono text-sm";

export default function DocusignSettingsTab() {
  const api = Boolean(getApiBaseUrl());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingSaved, setTestingSaved] = useState(false);
  const [settings, setSettings] = useState<DocusignSettingsDto | null>(null);
  const [environment, setEnvironment] = useState<"demo" | "production">("demo");
  const [integrationKey, setIntegrationKey] = useState("");
  const [userId, setUserId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [consentRedirectUri, setConsentRedirectUri] = useState("https://www.docusign.com");
  const [privateKey, setPrivateKey] = useState("");
  const [connectHmacKey, setConnectHmacKey] = useState("");
  const [consentUrl, setConsentUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const s = await getDocusignSettingsFromApi();
      setSettings(s);
      setEnvironment(s.environment);
      setIntegrationKey(s.integrationKey);
      setUserId(s.userId);
      setAccountId(s.accountId);
      setConsentRedirectUri(s.consentRedirectUri || "https://www.docusign.com");
      setPrivateKey("");
      setConnectHmacKey("");
      try {
        const url = await getDocusignConsentUrlFromApi();
        setConsentUrl(url);
      } catch {
        setConsentUrl(null);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load DocuSign settings.");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const buildSavePayload = () => ({
    environment,
    integrationKey: integrationKey.trim(),
    userId: userId.trim(),
    accountId: accountId.trim(),
    consentRedirectUri: consentRedirectUri.trim() || "https://www.docusign.com",
    ...(privateKey.trim() ? { privateKey: privateKey.trim() } : {}),
    ...(connectHmacKey.trim() ? { connectHmacKey: connectHmacKey.trim() } : {}),
  });

  const handleSave = async () => {
    if (!integrationKey.trim() || !userId.trim() || !accountId.trim()) {
      toast.error("Integration Key, User ID, and Account ID are required.");
      return;
    }
    if (!privateKey.trim() && !settings?.hasPrivateKey) {
      toast.error("RSA private key is required on first save.");
      return;
    }
    setSaving(true);
    try {
      const s = await saveDocusignSettingsToApi(buildSavePayload());
      setSettings(s);
      setPrivateKey("");
      setConnectHmacKey("");
      toast.success("DocuSign settings saved.");
      try {
        const url = await getDocusignConsentUrlFromApi();
        setConsentUrl(url);
      } catch {
        /* ignore */
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleTestForm = async () => {
    if (!integrationKey.trim() || !userId.trim() || !accountId.trim()) {
      toast.error("Integration Key, User ID, and Account ID are required to test.");
      return;
    }
    setTesting(true);
    try {
      const result = await testDocusignConnectionFromApi({
        environment,
        integrationKey: integrationKey.trim(),
        userId: userId.trim(),
        accountId: accountId.trim(),
        consentRedirectUri: consentRedirectUri.trim(),
        ...(privateKey.trim() ? { privateKey: privateKey.trim() } : {}),
        useStoredPrivateKey: !privateKey.trim() && Boolean(settings?.hasPrivateKey),
      });
      setConsentUrl(result.consentUrl);
      toast.success(result.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "JWT test failed.");
    } finally {
      setTesting(false);
    }
  };

  const handleTestSaved = async () => {
    setTestingSaved(true);
    try {
      const result = await testDocusignConnectionFromApi({ testSaved: true });
      setConsentUrl(result.consentUrl);
      toast.success(result.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "JWT test failed.");
    } finally {
      setTestingSaved(false);
    }
  };

  if (!api) {
    return (
      <p className="text-sm text-muted-foreground">
        Set VITE_API_URL to manage DocuSign integration from the portal.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading DocuSign settings…
      </div>
    );
  }

  const sourceLabel =
    settings?.source === "database"
      ? "Saved in database"
      : settings?.source === "environment"
        ? "Using server environment variables (fallback)"
        : "Not configured";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex w-full min-w-0 flex-col gap-5 overflow-x-hidden"
    >
      <div className="min-w-0 space-y-1">
        <h3 className="font-display font-semibold text-foreground">DocuSign JWT integration</h3>
        <p className="text-sm text-muted-foreground">
          Credentials are encrypted with JWT_ACCESS_SECRET (same as SMTP). Status:{" "}
          <span className="text-foreground">{sourceLabel}</span>
          {settings?.configured ? "" : " — save here or set DOCUSIGN_* on the server."}
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="min-w-0 space-y-2 md:max-w-xs">
          <label className="text-sm font-medium text-foreground">Environment</label>
          <Select value={environment} onValueChange={(v) => setEnvironment(v as "demo" | "production")}>
            <SelectTrigger className="w-full min-w-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="demo">Demo (developer)</SelectItem>
              <SelectItem value="production">Production</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {settings?.basePath ? (
          <div className="min-w-0 text-xs text-muted-foreground md:col-span-2 xl:col-span-2 flex items-end pb-2 break-all">
            API: {settings.basePath} · OAuth: {settings.oauthHost}
          </div>
        ) : null}

        <div className="min-w-0 space-y-2 md:col-span-2 xl:col-span-3">
          <label className="text-sm font-medium text-foreground">Integration Key (Client ID)</label>
          <Input
            value={integrationKey}
            onChange={(e) => setIntegrationKey(e.target.value)}
            autoComplete="off"
            className={fieldInputClass}
          />
        </div>

        <div className="min-w-0 space-y-2">
          <label className="text-sm font-medium text-foreground">User ID (impersonation)</label>
          <Input value={userId} onChange={(e) => setUserId(e.target.value)} autoComplete="off" className={fieldInputClass} />
        </div>

        <div className="min-w-0 space-y-2">
          <label className="text-sm font-medium text-foreground">Account ID</label>
          <Input
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            autoComplete="off"
            className={fieldInputClass}
          />
        </div>

        <div className="min-w-0 space-y-2 md:col-span-2 xl:col-span-2">
          <label className="text-sm font-medium text-foreground">Consent redirect URI</label>
          <Input
            value={consentRedirectUri}
            onChange={(e) => setConsentRedirectUri(e.target.value)}
            className="min-w-0 w-full"
          />
          <p className="text-xs text-muted-foreground">Must match a redirect URI in DocuSign Apps and Keys.</p>
        </div>

        <div className="min-w-0 space-y-2 md:col-span-2 xl:col-span-3">
          <label className="text-sm font-medium text-foreground">RSA private key (PEM)</label>
          <Textarea
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            placeholder={
              settings?.hasPrivateKey
                ? "Leave blank to keep the saved key"
                : "-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
            }
            rows={4}
            className={cn(fieldInputClass, "resize-none")}
            autoComplete="off"
          />
        </div>

        <div className="min-w-0 space-y-2 md:col-span-2 xl:col-span-2">
          <label className="text-sm font-medium text-foreground">Connect HMAC secret</label>
          <Input
            type="password"
            value={connectHmacKey}
            onChange={(e) => setConnectHmacKey(e.target.value)}
            placeholder={
              settings?.hasConnectHmacKey ? "Leave blank to keep saved secret" : "From DocuSign Connect configuration"
            }
            autoComplete="new-password"
            className="min-w-0 w-full"
          />
        </div>

        {consentUrl ? (
          <div className="min-w-0 md:col-span-2 xl:col-span-3">
            <a
              href={consentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary inline-flex max-w-full items-center gap-1 text-sm hover:underline break-all"
            >
              Open JWT consent URL
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </a>
            <p className="text-muted-foreground mt-1 text-xs">
              Sign in as the User ID above, then open this link once per integration key.
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button onClick={() => void handleSave()} disabled={saving} className="shrink-0">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save
        </Button>
        <Button variant="outline" onClick={() => void handleTestForm()} disabled={testing} className="shrink-0">
          {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Test JWT (form)
        </Button>
        {settings?.configured ? (
          <Button variant="outline" onClick={() => void handleTestSaved()} disabled={testingSaved} className="shrink-0">
            {testingSaved ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Test saved settings
          </Button>
        ) : null}
      </div>
    </motion.div>
  );
}
