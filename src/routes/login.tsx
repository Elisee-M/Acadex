import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — Acadex" }, { name: "description", content: "Sign in to your Acadex workspace." }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@acadex.com");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const u = login(email, password);
      setLoading(false);
      if (!u) { toast.error("Invalid credentials"); return; }
      toast.success(`Welcome, ${u.name}`);
      navigate({ to: "/app/dashboard" });
    }, 250);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block" style={{ background: "var(--gradient-hero)" }}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
          <Link to="/"><Logo className="h-9 w-9" /></Link>
          <div>
            <h2 className="text-4xl font-bold leading-tight">Track. Manage. Deliver.</h2>
            <p className="mt-4 max-w-md text-white/80">The accountability platform built for modern schools.</p>
          </div>
          <div className="text-xs text-white/60">© {new Date().getFullYear()} Acadex</div>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8"><Link to="/"><Logo /></Link></div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your Acadex account.</p>
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-[var(--gradient-primary)] shadow-[var(--shadow-elegant)]">
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
            <div className="font-semibold text-foreground">Demo accounts</div>
            <ul className="mt-2 space-y-1">
              <li>Super: admin@acadex.com / admin123</li>
              <li>School Admin: principal@greenfield.edu / school123</li>
              <li>Finance: finance@greenfield.edu / staff123</li>
              <li>Logistics: logistics@greenfield.edu / staff123</li>
              <li>Academic: academic@greenfield.edu / staff123</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
