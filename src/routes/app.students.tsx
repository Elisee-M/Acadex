import { createFileRoute } from "@tanstack/react-router";
import { useDB, useSession } from "@/hooks/use-acadex";
import { loadDB, saveDB, uid, hasPermission } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { StatusBadge } from "./app.dashboard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/app/students")({
  head: () => ({ meta: [{ title: "Students — Acadex" }] }),
  component: StudentsPage,
});

function StudentsPage() {
  const db = useDB();
  const user = useSession()!;
  const canEdit = hasPermission(user, "manage_students");
  const schoolId = user.schoolId ?? db.schools[0]?.id;
  const students = db.students.filter((s) => user.role === "super_admin" || s.schoolId === user.schoolId);
  const materials = db.materials.filter((m) => m.schoolId === schoolId);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");

  function addStudent() {
    if (!name || !className) return toast.error("Fill all fields");
    const next = loadDB();
    next.students.push({ id: "st_" + uid(), schoolId: schoolId!, name, className });
    // create tracking rows for each material
    materials.forEach((m) => next.tracking.push({
      id: "tr_" + uid(), schoolId: schoolId!, studentId: next.students[next.students.length-1].id,
      materialId: m.id, status: "pending", promisedDate: null, updatedAt: new Date().toISOString(),
    }));
    saveDB(next);
    setOpen(false); setName(""); setClassName("");
    toast.success("Student added");
  }

  function removeStudent(id: string) {
    const next = loadDB();
    next.students = next.students.filter((s) => s.id !== id);
    next.tracking = next.tracking.filter((t) => t.studentId !== id);
    saveDB(next);
  }

  function updateStatus(studentId: string, materialId: string, status: "completed" | "pending" | "overdue") {
    const next = loadDB();
    const t = next.tracking.find((x) => x.studentId === studentId && x.materialId === materialId);
    if (t) { t.status = status; t.updatedAt = new Date().toISOString(); saveDB(next); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Students</h1>
          <p className="text-sm text-muted-foreground">Manage students and their material tracking.</p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="bg-[var(--gradient-primary)]"><Plus className="mr-2 h-4 w-4" /> Add Student</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add new student</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div><Label>Class</Label><Input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="e.g. JSS 1" /></div>
              </div>
              <DialogFooter><Button onClick={addStudent} className="bg-[var(--gradient-primary)]">Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader><CardTitle className="text-base">All students ({students.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Class</TableHead>
                {materials.map((m) => <TableHead key={m.id}>{m.name}</TableHead>)}
                {canEdit && <TableHead className="w-12"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.className}</TableCell>
                  {materials.map((m) => {
                    const t = db.tracking.find((x) => x.studentId === s.id && x.materialId === m.id);
                    if (!t) return <TableCell key={m.id}>—</TableCell>;
                    return (
                      <TableCell key={m.id}>
                        {canEdit ? (
                          <Select value={t.status} onValueChange={(v) => updateStatus(s.id, m.id, v as any)}>
                            <SelectTrigger className="h-8 w-[120px] border-none p-0 shadow-none [&>svg]:hidden"><SelectValue><StatusBadge status={t.status} /></SelectValue></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="overdue">Overdue</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : <StatusBadge status={t.status} />}
                      </TableCell>
                    );
                  })}
                  {canEdit && <TableCell><Button size="icon" variant="ghost" onClick={() => removeStudent(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
