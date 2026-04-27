import { createFileRoute } from "@tanstack/react-router";
import { useDB, useSession } from "@/hooks/use-acadex";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Acadex" }] }),
  component: Dashboard,
});

function Dashboard() {
  const db = useDB();
  const user = useSession()!;
  const scope = user.role === "super_admin" ? db : {
    ...db,
    students: db.students.filter((s) => s.schoolId === user.schoolId),
    materials: db.materials.filter((m) => m.schoolId === user.schoolId),
    tracking: db.tracking.filter((t) => t.schoolId === user.schoolId),
    schools: db.schools.filter((s) => s.id === user.schoolId),
  };

  const completed = scope.tracking.filter((t) => t.status === "completed").length;
  const pending = scope.tracking.filter((t) => t.status === "pending").length;
  const overdue = scope.tracking.filter((t) => t.status === "overdue").length;
  const total = scope.tracking.length || 1;

  const stats = [
    { label: "Total Students", value: scope.students.length, icon: Users, tone: "text-primary", bg: "bg-primary/10" },
    { label: "Materials Tracked", value: scope.tracking.length, icon: Package, tone: "text-primary-deep", bg: "bg-accent" },
    { label: "Pending Items", value: pending, icon: Clock, tone: "text-warning", bg: "bg-warning/10" },
    { label: "Overdue", value: overdue, icon: AlertTriangle, tone: "text-destructive", bg: "bg-destructive/10" },
  ];

  const recent = [...scope.tracking].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome back, {user.name.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground">Here's what's happening across {user.role === "super_admin" ? "all schools" : scope.schools[0]?.name ?? "your school"}.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-border shadow-[var(--shadow-card)]">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</div>
                <div className={`mt-1 text-3xl font-bold ${s.tone}`}>{s.value}</div>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.bg}`}>
                <s.icon className={`h-6 w-6 ${s.tone}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-[var(--shadow-card)]">
          <CardHeader><CardTitle className="text-base">Recent activity</CardTitle></CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {recent.map((t) => {
                const stu = db.students.find((s) => s.id === t.studentId);
                const mat = db.materials.find((m) => m.id === t.materialId);
                return (
                  <div key={t.id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="text-sm font-medium text-foreground">{stu?.name} — {mat?.name}</div>
                      <div className="text-xs text-muted-foreground">{stu?.className}{t.promisedDate ? ` • Promised ${new Date(t.promisedDate).toLocaleDateString()}` : ""}</div>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader><CardTitle className="text-base">Completion overview</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Bar label="Completed" pct={(completed / total) * 100} color="bg-success" icon={<CheckCircle2 className="h-4 w-4 text-success" />} />
            <Bar label="Pending" pct={(pending / total) * 100} color="bg-warning" icon={<Clock className="h-4 w-4 text-warning" />} />
            <Bar label="Overdue" pct={(overdue / total) * 100} color="bg-destructive" icon={<AlertTriangle className="h-4 w-4 text-destructive" />} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Bar({ label, pct, color, icon }: { label: string; pct: number; color: string; icon: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-foreground">{icon} {label}</span>
        <span className="text-muted-foreground">{Math.round(pct)}%</span>
      </div>
      <div className="mt-2 h-2 w-full rounded-full bg-muted">
        <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: "completed" | "pending" | "overdue" }) {
  const map = {
    completed: { label: "Completed", cls: "bg-success/15 text-success border-success/30" },
    pending: { label: "Pending", cls: "bg-warning/15 text-warning border-warning/30" },
    overdue: { label: "Overdue", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  } as const;
  const { label, cls } = map[status];
  return <Badge variant="outline" className={cls}>{label}</Badge>;
}
