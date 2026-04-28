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
import { Plus, Trash2, Eye } from "lucide-react";
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
  const [viewStudent, setViewStudent] = useState<string | null>(null);

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
                <TableHead>Materials summary</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">No students yet.</TableCell></TableRow>
              )}
              {students.map((s) => {
                const cls = db.classes.find((c) => c.id === s.classId);
                const studentTracking = db.tracking.filter((t) => t.studentId === s.id);
                const done = studentTracking.filter((t) => t.status === "completed").length;
                const total = studentTracking.length;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{cls ? classDisplayName(cls) : (s.className || "—")}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{done} / {total} completed</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => setViewStudent(s.id)}>
                          <Eye className="mr-1 h-3.5 w-3.5" /> View
                        </Button>
                        {canEdit && (
                          <Button size="icon" variant="ghost" onClick={() => removeStudent(s.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <StudentDetailDialog studentId={viewStudent} onClose={() => setViewStudent(null)} />
    </div>
  );
}

function StudentDetailDialog({ studentId, onClose }: { studentId: string | null; onClose: () => void }) {
  const db = useDB();
  const student = studentId ? db.students.find((s) => s.id === studentId) : null;
  const cls = student ? db.classes.find((c) => c.id === student.classId) : null;
  const rows = student
    ? db.materials.filter((m) => m.schoolId === student.schoolId).map((m) => {
        const t = db.tracking.find((x) => x.studentId === student.id && x.materialId === m.id);
        return { material: m, tracking: t };
      })
    : [];
  return (
    <Dialog open={!!studentId} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{student?.name} — Materials</DialogTitle>
        </DialogHeader>
        {student && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Class: <span className="font-medium text-foreground">{cls ? classDisplayName(cls) : (student.className || "—")}</span>
            </div>
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Promised date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">No materials defined.</TableCell></TableRow>
                  )}
                  {rows.map(({ material, tracking }) => (
                    <TableRow key={material.id}>
                      <TableCell className="font-medium">{material.name}</TableCell>
                      <TableCell className="capitalize">{material.kind}</TableCell>
                      <TableCell><StatusBadge status={tracking?.status ?? "pending"} /></TableCell>
                      <TableCell>{tracking?.promisedDate ? new Date(tracking.promisedDate).toLocaleDateString() : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
