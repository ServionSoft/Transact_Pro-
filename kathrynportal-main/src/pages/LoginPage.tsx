import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/authStore";
import BrandLogo from "@/components/brand/BrandLogo";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const loginWithPassword = useAuthStore((s) => s.loginWithPassword);
  const user = useAuthStore((s) => s.user);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const redirectPath = (location.state as { from?: string } | null)?.from || "/";

  useEffect(() => {
    if (user) {
      navigate(redirectPath, { replace: true });
    }
  }, [navigate, redirectPath, user]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Email and password are required.");
      return;
    }
    setSubmitting(true);
    try {
      await loginWithPassword(email.trim(), password);
      navigate(redirectPath, { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      toast.error("Login failed", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(215_45%_12%)] p-4">
      <div className="w-full max-w-md rounded-xl border border-border/60 bg-card p-6 shadow-lg sm:p-8">
        <div className="mb-6 flex justify-center rounded-lg bg-[hsl(215_45%_12%)] px-4 py-5">
          <BrandLogo className="max-h-24 max-w-[280px]" />
        </div>
        <h1 className="mb-1 text-center text-xl font-semibold text-foreground">Sign in</h1>
        <p className="mb-5 text-center text-sm text-muted-foreground">Use your portal account to continue.</p>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
