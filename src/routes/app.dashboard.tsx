import { createFileRoute, Link } from "@tanstack/react-router";
import { useDB, useSession } from "@/hooks/use-acadex";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Package,
  AlertTriangle,
  CheckCircle2,
  Clock,
  GraduationCap,
  ArrowUpRight,
  TrendingUp,
  Trophy,
  Award,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Acadex" }] }),
  component: Dashboard,
});

function Dashboard() {
  const db = useDB();
  const user = useSession()!;

  const scope =
    user.role === "super_admin"
      ? db
      : {
          ...db,
          students: db.students.filter((s) => s.schoolId === user.schoolId),
          materials: db.materials.filter((m) => m.schoolId === user.schoolId),
          tracking: db.tracking.filter((t) => t.schoolId === user.schoolId),
          schools: db.schools.filter((s) => s.id === user.schoolId),
          classes: db.classes.filter((c) => c.schoolId === user.schoolId),
        };

  const completed = scope.tracking.filter((t) => t.status === "completed").length;
  const pending = scope.tracking.filter((t) => t.status === "pending").length;
  const overdue = scope.tracking.filter((t) => t.status === "overdue").length;
  const total = scope.tracking.length;
  const completionRate = total ? Math.round((completed / total) * 100) : 0;

  const stats = [
    {
      label: "Students",
      value: scope.students.length,
      icon: Users,
      tone: "text-primary",
      bg: "bg-primary/10",
      hint: `${scope.classes.length} classes`,
    },
    {
      label: "Materials",
      value: scope.materials.length,
      icon: Package,
      tone: "text-primary-deep",
      bg: "bg-accent",
      hint: `${total} tracked items`,
    },
    {
      label: "Completion",
      value: `${completionRate}%`,
      icon: TrendingUp,
      tone: "text-success",
      bg: "bg-success/10",
      hint: `${completed} completed`,
    },
    {
      label: "Needs attention",
      value: pending + overdue,
      icon: AlertTriangle,
      tone: "text-destructive",
      bg: "bg-destructive/10",
      hint: `${overdue} overdue`,
    },
  ];

  // Activity over last 7 days
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const trend = days.map((d) => {
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    const dayItems = scope.tracking.filter((t) => {
      const u = new Date(t.updatedAt);
      return u >= d && u < next;
    });
    return {
      day: d.toLocaleDateString(undefined, { weekday: "short" }),
      completed: dayItems.filter((t) => t.status === "completed").length,
      pending: dayItems.filter((t) => t.status === "pending").length,
    };
  });

  const statusData = [
    { name: "Completed", value: completed, color: "var(--success)" },
    { name: "Pending", value: pending, color: "var(--warning)" },
    { name: "Overdue", value: overdue, color: "var(--destructive)" },
  ].filter((d) => d.value > 0);

  // Per-class breakdown (top 6)
  const classBreakdown = scope.classes
    .map((c) => {
      const studentIds = scope.students.filter((s) => s.classId === c.id).map((s) => s.id);
      const items = scope.tracking.filter((t) => studentIds.includes(t.studentId));
      const cName =
        c.level.startsWith("L") && c.abbreviation
          ? `${c.level} ${c.abbreviation}`
          : c.level;
      return {
        name: cName,
        completed: items.filter((t) => t.status === "completed").length,
        pending: items.filter((t) => t.status === "pending").length,
        overdue: items.filter((t) => t.status === "overdue").length,
      };
    })
    .sort((a, b) => b.completed + b.pending + b.overdue - (a.completed + a.pending + a.overdue))
    .slice(0, 6);

  // Top class by brought-rate (min 1 tracked item to be eligible)
  const classRanking = scope.classes
    .map((c) => {
      const studentIds = scope.students.filter((s) => s.classId === c.id).map((s) => s.id);
      const items = scope.tracking.filter((t) => studentIds.includes(t.studentId));
      const done = items.filter((t) => t.status === "completed").length;
      const cName =
        c.level.startsWith("L") && c.abbreviation
          ? `${c.level} ${c.abbreviation}`
          : c.level.startsWith("L") && c.trade
            ? `${c.level} ${c.trade}`
            : c.level;
      return { name: cName, total: items.length, completed: done, rate: items.length ? Math.round((done / items.length) * 100) : 0 };
    })
    .filter((c) => c.total > 0)
    .sort((a, b) => b.rate - a.rate || b.completed - a.completed);
  const topClass = classRanking[0];

  // Top trade by brought-rate (aggregate all classes sharing a trade)
  const tradeMap = new Map<string, { total: number; completed: number }>();
  for (const c of scope.classes) {
    const trade = c.trade?.trim();
    if (!trade) continue;
    const studentIds = scope.students.filter((s) => s.classId === c.id).map((s) => s.id);
    const items = scope.tracking.filter((t) => studentIds.includes(t.studentId));
    const done = items.filter((t) => t.status === "completed").length;
    const prev = tradeMap.get(trade) ?? { total: 0, completed: 0 };
    tradeMap.set(trade, { total: prev.total + items.length, completed: prev.completed + done });
  }
  const tradeRanking = Array.from(tradeMap.entries())
    .map(([name, v]) => ({ name, total: v.total, completed: v.completed, rate: v.total ? Math.round((v.completed / v.total) * 100) : 0 }))
    .filter((t) => t.total > 0)
    .sort((a, b) => b.rate - a.rate || b.completed - a.completed);
  const topTrade = tradeRanking[0];

  const recent = [...scope.tracking]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);

  const isEmpty = scope.students.length === 0 && scope.materials.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome back, {user.name.split(" ")[0]}
          </h1>
          <p className="text-sm text-muted-foreground">
            {user.role === "super_admin"
              ? `Overview across ${db.schools.length} school${db.schools.length === 1 ? "" : "s"}.`
              : `Here's the latest from ${scope.schools[0]?.name ?? "your school"}.`}
          </p>
        </div>
        <Badge variant="outline" className="w-fit border-primary/30 bg-primary/5 text-primary">
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </Badge>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-border shadow-[var(--shadow-card)]">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {s.label}
                  </div>
                  <div className={`mt-2 text-3xl font-bold ${s.tone}`}>{s.value}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{s.hint}</div>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.bg}`}>
                  <s.icon className={`h-5 w-5 ${s.tone}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isEmpty ? (
        <Card className="border-dashed shadow-[var(--shadow-card)]">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <GraduationCap className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Get started with Acadex</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Add classes, students, and materials to see your dashboard light up.
              </p>
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Button asChild size="sm">
                <Link to="/app/classes">Add classes</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/app/students">Add students</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/app/materials">Add materials</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Top performers */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="shadow-[var(--shadow-card)] border-success/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-success" /> Top class
                  </CardTitle>
                  <CardDescription>Highest "brought" rate</CardDescription>
                </div>
                {topClass && (
                  <Badge className="bg-success/15 text-success border-success/30" variant="outline">
                    {topClass.rate}%
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {!topClass ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">No class data yet.</div>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-foreground">{topClass.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {topClass.completed} of {topClass.total} items brought
                    </div>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-success transition-all" style={{ width: `${topClass.rate}%` }} />
                    </div>
                    {classRanking.length > 1 && (
                      <ul className="mt-4 space-y-1.5 text-sm">
                        {classRanking.slice(1, 4).map((c, i) => (
                          <li key={c.name} className="flex items-center justify-between text-muted-foreground">
                            <span>{i + 2}. {c.name}</span>
                            <span className="font-medium text-foreground">{c.rate}%</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-[var(--shadow-card)] border-primary/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" /> Top trade
                  </CardTitle>
                  <CardDescription>Aggregated across L-classes</CardDescription>
                </div>
                {topTrade && (
                  <Badge className="bg-primary/15 text-primary border-primary/30" variant="outline">
                    {topTrade.rate}%
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {!topTrade ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">No trade data yet.</div>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-foreground">{topTrade.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {topTrade.completed} of {topTrade.total} items brought
                    </div>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary transition-all" style={{ width: `${topTrade.rate}%` }} />
                    </div>
                    {tradeRanking.length > 1 && (
                      <ul className="mt-4 space-y-1.5 text-sm">
                        {tradeRanking.slice(1, 4).map((t, i) => (
                          <li key={t.name} className="flex items-center justify-between text-muted-foreground">
                            <span>{i + 2}. {t.name}</span>
                            <span className="font-medium text-foreground">{t.rate}%</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts row */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2 shadow-[var(--shadow-card)]">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-base">Activity (last 7 days)</CardTitle>
                  <CardDescription>Tracking updates per day</CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="border-success/30 bg-success/10 text-success"
                >
                  {completionRate}% complete
                </Badge>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gComp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--success)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gPend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--warning)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="var(--warning)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis
                        dataKey="day"
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          fontSize: 12,
                          color: "var(--popover-foreground)",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="completed"
                        stroke="var(--success)"
                        strokeWidth={2}
                        fill="url(#gComp)"
                      />
                      <Area
                        type="monotone"
                        dataKey="pending"
                        stroke="var(--warning)"
                        strokeWidth={2}
                        fill="url(#gPend)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-[var(--shadow-card)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Status breakdown</CardTitle>
                <CardDescription>All tracked materials</CardDescription>
              </CardHeader>
              <CardContent>
                {statusData.length === 0 ? (
                  <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                    No tracking data yet.
                  </div>
                ) : (
                  <>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="var(--background)"
                            strokeWidth={2}
                          >
                            {statusData.map((d) => (
                              <Cell key={d.name} fill={d.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: "var(--popover)",
                              border: "1px solid var(--border)",
                              borderRadius: 12,
                              fontSize: 12,
                              color: "var(--popover-foreground)",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-3 space-y-2">
                      {statusData.map((d) => (
                        <div key={d.name} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-foreground">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ background: d.color }}
                            />
                            {d.name}
                          </span>
                          <span className="font-medium text-foreground">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Class breakdown + Recent activity */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2 shadow-[var(--shadow-card)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Per class</CardTitle>
                <CardDescription>Tracking status across top classes</CardDescription>
              </CardHeader>
              <CardContent>
                {classBreakdown.length === 0 ? (
                  <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
                    No classes yet.
                  </div>
                ) : (
                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={classBreakdown}
                        margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                        barCategoryGap={20}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis
                          dataKey="name"
                          stroke="var(--muted-foreground)"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="var(--muted-foreground)"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip
                          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                          contentStyle={{
                            background: "var(--popover)",
                            border: "1px solid var(--border)",
                            borderRadius: 12,
                            fontSize: 12,
                            color: "var(--popover-foreground)",
                          }}
                        />
                        <Bar dataKey="completed" stackId="a" fill="var(--success)" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="pending" stackId="a" fill="var(--warning)" />
                        <Bar dataKey="overdue" stackId="a" fill="var(--destructive)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-[var(--shadow-card)]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-base">Recent activity</CardTitle>
                  <CardDescription>Latest tracking updates</CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm" className="text-xs">
                  <Link to="/app/tracking">
                    View all <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                {recent.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    No activity yet.
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {recent.map((t) => {
                      const stu = db.students.find((s) => s.id === t.studentId);
                      const mat = db.materials.find((m) => m.id === t.materialId);
                      return (
                        <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-foreground">
                              {stu?.name ?? "Unknown"}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {mat?.name ?? "Material"}
                              {t.promisedDate
                                ? ` • ${new Date(t.promisedDate).toLocaleDateString()}`
                                : ""}
                            </div>
                          </div>
                          <StatusBadge status={t.status} />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status: "completed" | "pending" | "overdue" }) {
  const map = {
    completed: {
      label: "Completed",
      cls: "bg-success/15 text-success border-success/30",
      icon: <CheckCircle2 className="mr-1 h-3 w-3" />,
    },
    pending: {
      label: "Pending",
      cls: "bg-warning/15 text-warning border-warning/30",
      icon: <Clock className="mr-1 h-3 w-3" />,
    },
    overdue: {
      label: "Overdue",
      cls: "bg-destructive/15 text-destructive border-destructive/30",
      icon: <AlertTriangle className="mr-1 h-3 w-3" />,
    },
  } as const;
  const { label, cls, icon } = map[status];
  return (
    <Badge variant="outline" className={`${cls} flex items-center`}>
      {icon}
      {label}
    </Badge>
  );
}
