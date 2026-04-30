import { useCallback, useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { useAuthStore } from "@/store/authStore";
import {
  getSmtpSettingsFromApi,
  saveSmtpSettingsToApi,
  testSmtpConnectionFromApi,
  type SmtpSettingsDto,
} from "@/api/smtpSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function SmtpSettingsTab() {
  const api = Boolean(getApiBaseUrl());
  const sessionEmail = useAuthStore((s) => s.user?.email?.trim() ?? "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingSaved, setTestingSaved] = useState(false);
  const [settings, setSettings] = useState<SmtpSettingsDto | null>(null);
  const [host, setHost] = useState("");
  const [port, setPort] = useState("587");
  const [secure, setSecure] = useState(false);
  const [authUser, setAuthUser] = useState("");
  const [password, setPassword] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [testRecipient, setTestRecipient] = useState("");

  const load = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const s = await getSmtpSettingsFromApi();
      setSettings(s);
      setHost(s.host);
      setPort(String(s.port));
      setSecure(s.secure);
      setAuthUser(s.authUser);
      setPassword("");
      setFromEmail(s.fromEmail);
      setFromName(s.fromName);
      setTestRecipient((prev) => (prev.trim() ? prev : sessionEmail));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load SMTP settings.");
    } finally {
      setLoading(false);
    }
  }, [api, sessionEmail]);

  useEffect(() => {
    void load();
  }, [load]);

  const parsePort = (): number | null => {
    const n = Number(port);
    if (!Number.isFinite(n) || n < 1 || n > 65535) return null;
    return Math.trunc(n);
  };

  const handleSave = async () => {
    const p = parsePort();
    if (p === null) {
      toast.error("Port must be a number between 1 and 65535.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        host: host.trim(),
        port: p,
        secure,
        authUser: authUser.trim(),
        fromEmail: fromEmail.trim(),
        fromName: fromName.trim(),
        ...(password.trim() ? { password: password.trim() } : {}),
      };
      const s = await saveSmtpSettingsToApi(payload);
      setSettings(s);
      setPassword("");
      toast.success("SMTP settings saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleTestForm = async () => {
    const p = parsePort();
    if (p === null) {
      toast.error("Port must be a number between 1 and 65535.");
      return;
    }
    if (!testRecipient.trim() && !sessionEmail) {
      toast.error("Enter an email address to receive the test message.");
      return;
    }
    setTesting(true);
    try {
      const msg = await testSmtpConnectionFromApi({
        host: host.trim(),
        port: p,
        secure,
        authUser: authUser.trim(),
        fromEmail: fromEmail.trim(),
        fromName: fromName.trim(),
        sendTestEmailTo: testRecipient.trim() || sessionEmail || undefined,
        ...(password.trim() ? { password: password.trim() } : {}),
        useStoredPassword: !password.trim() && Boolean(settings?.hasPassword),
      });
      toast.success(msg);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connection test failed.");
    } finally {
      setTesting(false);
    }
  };

  const handleTestSaved = async () => {
    if (!testRecipient.trim() && !sessionEmail) {
      toast.error("Enter an email address to receive the test message.");
      return;
    }
    setTestingSaved(true);
    try {
      const msg = await testSmtpConnectionFromApi({
        testSaved: true,
        sendTestEmailTo: testRecipient.trim() || sessionEmail || undefined,
      });
      toast.success(msg);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connection test failed.");
    } finally {
      setTestingSaved(false);
    }
  };

  if (!api) {
    return (
      <p className="text-sm text-muted-foreground">
        Set <code className="text-xs bg-muted px-1 rounded">VITE_API_URL</code> to configure SMTP against the API.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading SMTP settings…
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Outbound mail uses these credentials. The SMTP password is encrypted in the database (AES-256-GCM; key derived from JWT_ACCESS_SECRET). It is never shown again after save. Leave the password field blank when saving to keep the current one.
      </p>

      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-foreground">SMTP host</label>
            <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="e.g. smtp.office365.com" autoComplete="off" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Port</label>
            <Input value={port} onChange={(e) => setPort(e.target.value)} placeholder="587" inputMode="numeric" autoComplete="off" />
          </div>
          <div className="flex items-end gap-2 pb-2">
            <Checkbox id="smtp-secure" checked={secure} onCheckedChange={(v) => setSecure(v === true)} />
            <label htmlFor="smtp-secure" className="text-sm text-foreground cursor-pointer">
              TLS (implicit, e.g. port 465)
            </label>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Username</label>
            <Input value={authUser} onChange={(e) => setAuthUser(e.target.value)} placeholder="SMTP login" autoComplete="username" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={settings?.hasPassword ? "Leave blank to keep saved password" : "Optional if server allows open relay"}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">From email</label>
            <Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="noreply@yourdomain.com" autoComplete="off" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">From name</label>
            <Input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="TransactPro" autoComplete="off" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-foreground">Send test email to</label>
            <Input
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder={sessionEmail || "you@example.com"}
              type="email"
              autoComplete="email"
            />
            <p className="text-xs text-muted-foreground">
              Connection is verified, then a short test message is sent to this address (defaults to your login email).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button onClick={() => void handleSave()} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save settings
          </Button>
          <Button type="button" variant="outline" onClick={() => void handleTestForm()} disabled={testing || saving} className="gap-2">
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Test & send email (form)
          </Button>
          <Button type="button" variant="secondary" onClick={() => void handleTestSaved()} disabled={testingSaved || saving} className="gap-2">
            {testingSaved ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Test saved & send email
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
