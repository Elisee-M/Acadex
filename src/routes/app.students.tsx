import { createFileRoute } from "@tanstack/react-router";
import { useDB, useSession } from "@/hooks/use-acadex";
import { loadDB, saveDB, uid, hasPermission, classDisplayName } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { StatusBadge } from "./app.dashboard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/app/students")({
  head: () => ({ meta: [{ title: "Students — Acadex" }] }),
  component: StudentsPage,
});

function StudentsPage() {
  const db = useDB();
  const user = useSession()!;
  const canEdit = hasPermission(user, "manage_students");
  const schoolId = user.schoolId ?? db.schools[0]?.id;
  const classes = useMemo(
    () => db.classes.filter((c) => user.role === "super_admin" || c.schoolId === user.schoolId),
    [db.classes, user]
  );
  const materials = db.materials.filter((m) => m.schoolId === schoolId);

  const [filterClass, setFilterClass] = useState<string>("all");
  const students = db.students
    .filter((s) => user.role === "super_admin" || s.schoolId === user.schoolId)
    .filter((s) => filterClass === "all" || s.classId === filterClass);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [classId, setClassId] = useState<string>("");

  function addStudent() {
    if (!name.trim()) return toast.error("Enter the student name");
    if (!classId) return toast.error("Select a class");
    const next = loadDB();
    const cls = next.classes.find((c) => c.id === classId);
    if (!cls) return toast.error("Class not found");
    const newId = "st_" + uid();
    next.students.push({
      id: newId,
      schoolId: cls.schoolId,
      name: name.trim(),
      classId,
      className: classDisplayName(cls),
    });
    materials.filter((m) => m.schoolId === cls.schoolId).forEach((m) => next.tracking.push({
      id: "tr_" + uid(), schoolId: cls.schoolId, studentId: newId,
      materialId: m.id, status: "pending", promisedDate: null, updatedAt: new Date().toISOString(),
    }));
    saveDB(next);
    setOpen(false); setName(""); setClassId("");
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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Students</h1>
          <p className="text-sm text-muted-foreground">Manage students grouped by their classes.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter by class" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{classDisplayName(c)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canEdit && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button variant="gradient"><Plus className="mr-2 h-4 w-4" /> Add Student</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add new student</DialogTitle></DialogHeader>
                {classes.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    You need to create a class first. <Link to="/app/classes" className="text-primary underline">Go to Classes</Link>.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                    <div>
                      <Label>Class</Label>
                      <Select value={classId} onValueChange={setClassId}>
                        <SelectTrigger><SelectValue placeholder="Select class (e.g. S1, L5 CSA)" /></SelectTrigger>
                        <SelectContent>
                          {classes.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{classDisplayName(c)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                <DialogFooter><Button onClick={addStudent} variant="gradient" disabled={classes.length === 0}>Save</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
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
              {students.length === 0 && (
                <TableRow><TableCell colSpan={2 + materials.length + (canEdit ? 1 : 0)} className="text-center text-sm text-muted-foreground py-8">No students yet.</TableCell></TableRow>
              )}
              {students.map((s) => {
                const cls = db.classes.find((c) => c.id === s.classId);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{cls ? classDisplayName(cls) : (s.className || "—")}</TableCell>
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
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
