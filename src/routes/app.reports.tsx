import { createFileRoute } from "@tanstack/react-router";
import { useDB, useSession } from "@/hooks/use-acadex";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "./app.dashboard";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/app/reports")({
  head: () => ({ meta: [{ title: "Reports — Acadex" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const db = useDB();
  const user = useSession()!;
  const inScope = (sid: string) => user.role === "super_admin" || sid === user.schoolId;
  const students = db.students.filter((s) => inScope(s.schoolId));
  const materials = db.materials.filter((m) => inScope(m.schoolId));
  const tracking = db.tracking.filter((t) => inScope(t.schoolId));

  const [filter, setFilter] = useState<"all" | "pending" | "overdue" | "completed">("overdue");
  const classes = Array.from(new Set(students.map((s) => s.className)));

  const missing = tracking.filter((t) => filter === "all" ? true : t.status === filter);

  const byClass = classes.map((c) => {
    const stuIds = students.filter((s) => s.className === c).map((s) => s.id);
    const rows = tracking.filter((t) => stuIds.includes(t.studentId));
    return {
      className: c,
      total: rows.length,
      completed: rows.filter((r) => r.status === "completed").length,
      pending: rows.filter((r) => r.status === "pending").length,
      overdue: rows.filter((r) => r.status === "overdue").length,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground">Identify missing materials and overdue students.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {byClass.map((c) => (
          <Card key={c.className} className="shadow-[var(--shadow-card)]">
            <CardHeader><CardTitle className="text-base">{c.className}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Completed</span><span className="font-semibold text-success">{c.completed}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Pending</span><span className="font-semibold text-warning">{c.pending}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Overdue</span><span className="font-semibold text-destructive">{c.overdue}</span></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Detailed report</CardTitle>
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="overdue">Overdue only</SelectItem>
              <SelectItem value="pending">Pending only</SelectItem>
              <SelectItem value="completed">Completed only</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Class</TableHead><TableHead>Material</TableHead><TableHead>Status</TableHead><TableHead>Promised</TableHead></TableRow></TableHeader>
            <TableBody>
              {missing.map((t) => {
                const s = students.find((x) => x.id === t.studentId);
                const m = materials.find((x) => x.id === t.materialId);
                if (!s || !m) return null;
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.className}</TableCell>
                    <TableCell>{m.name}</TableCell>
                    <TableCell><StatusBadge status={t.status} /></TableCell>
                    <TableCell className="text-muted-foreground">{t.promisedDate ? new Date(t.promisedDate).toLocaleDateString() : "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
