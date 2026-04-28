import { createFileRoute, Outlet, Link, useNavigate, useLocation, redirect } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-acadex";
import { setSession, ROLE_LABEL, hasPermission } from "@/lib/store";
import { LayoutDashboard, Users, Package, FileBarChart, Settings, Building2, LogOut, Menu, X, GraduationCap, ClipboardCheck, Tag } from "lucide-react";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/app")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("acadex_session_v1");
      if (!raw) throw redirect({ to: "/login" });
    }
  },
  component: AppShell,
});

const NAV = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard, perm: null as null | string },
  { to: "/app/schools", label: "Schools", icon: Building2, perm: "manage_schools" },
  { to: "/app/students", label: "Students", icon: Users, perm: "manage_students" },
  { to: "/app/classes", label: "Classes", icon: GraduationCap, perm: "manage_classes" },
  { to: "/app/categories", label: "Categories", icon: Tag, perm: "manage_materials" },
  { to: "/app/materials", label: "Materials", icon: Package, perm: "manage_materials" },
  { to: "/app/tracking", label: "Tracking", icon: ClipboardCheck, perm: null },
  { to: "/app/reports", label: "Reports", icon: FileBarChart, perm: "view_reports" },
  { to: "/app/settings", label: "Settings", icon: Settings, perm: null },
] as const;

function AppShell() {
  const user = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  function logout() {
    setSession(null);
    navigate({ to: "/login" });
  }

  const visible = NAV.filter((n) => !n.perm || hasPermission(user, n.perm as any));

  return (
    <div className="min-h-screen bg-[var(--gradient-subtle)]">
      <Toaster />
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-border bg-card transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <Link to="/"><Logo /></Link>
          <button className="lg:hidden" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {visible.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link key={item.to} to={item.to} onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${active ? "bg-primary text-primary-foreground shadow-[var(--shadow-elegant)]" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
                <item.icon className="h-4 w-4" /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute inset-x-0 bottom-0 border-t border-border p-3">
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="text-sm font-semibold text-foreground">{user.name}</div>
            <div className="text-xs text-muted-foreground">{ROLE_LABEL[user.role]}</div>
            <Button variant="outline" size="sm" className="mt-3 w-full" onClick={logout}>
              <LogOut className="mr-2 h-3 w-3" /> Sign out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
          <button className="lg:hidden" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
          <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
            <span className="hidden sm:inline">{ROLE_LABEL[user.role]}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {user.name.split(" ").map(s=>s[0]).slice(0,2).join("")}
            </div>
          </div>
        </header>
        <main className="p-6"><Outlet /></main>
      </div>
    </div>
  );
}
