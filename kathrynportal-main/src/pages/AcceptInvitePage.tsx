import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { acceptInviteApi } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("Missing invite token in URL.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await acceptInviteApi(token, password);
      toast.success("Account activated. Sign in with your email and password.");
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Activation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md border border-border rounded-lg p-6 bg-card">
        <h1 className="text-xl font-semibold text-foreground mb-1">Accept invitation</h1>
        <p className="text-sm text-muted-foreground mb-5">Set a password for your portal account.</p>
        {!token && <p className="text-sm text-destructive mb-4">Invalid invite link.</p>}
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="pw">Password</Label>
            <Input
              id="pw"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting || !token}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw2">Confirm password</Label>
            <Input
              id="pw2"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={submitting || !token}
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting || !token}>
            {submitting ? "Activating…" : "Activate account"}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          <Link to="/login" className="underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
