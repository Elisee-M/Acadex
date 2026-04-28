import { createFileRoute } from "@tanstack/react-router";
import { useDB, useSession } from "@/hooks/use-acadex";
import { loadDB, saveDB, uid, hasPermission } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Plus, Trash2, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/app/materials")({
  head: () => ({ meta: [{ title: "Materials — Acadex" }] }),
  component: MaterialsPage,
});

function MaterialsPage() {
  const db = useDB();
  const user = useSession()!;
  const canEdit = hasPermission(user, "manage_materials");
  const schoolId = user.schoolId ?? db.schools[0]?.id;
  const materials = db.materials.filter((m) => user.role === "super_admin" || m.schoolId === user.schoolId);

  // Eligible staff to assign (staff members of this school)
  const staffList = db.users.filter((u) =>
    u.role === "staff" && (user.role === "super_admin" || u.schoolId === user.schoolId)
  );

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [assignedStaffId, setAssignedStaffId] = useState<string>("");

  function add() {
    if (!name.trim()) return toast.error("Enter material name");
    if (!assignedStaffId) return toast.error("Select the staff who will check this material");
    const next = loadDB();
    const staff = next.users.find((u) => u.id === assignedStaffId);
    if (!staff || !staff.schoolId) return toast.error("Staff not found");
    const id = "m_" + uid();
    next.materials.push({ id, schoolId: staff.schoolId, name: name.trim(), assignedStaffId });
    next.students.filter((s) => s.schoolId === staff.schoolId).forEach((s) => {
      next.tracking.push({
        id: "tr_" + uid(),
        schoolId: staff.schoolId!,
        studentId: s.id,
        materialId: id,
        status: "pending",
        promisedDate: null,
        updatedAt: new Date().toISOString(),
      });
    });
    saveDB(next);
    setOpen(false); setName(""); setAssignedStaffId("");
    toast.success("Material added");
  }

  function remove(id: string) {
    const next = loadDB();
    next.materials = next.materials.filter((m) => m.id !== id);
    next.tracking = next.tracking.filter((t) => t.materialId !== id);
    saveDB(next);
  }

  function staffLabel(uid: string): string {
    const u = db.users.find((x) => x.id === uid);
    if (!u) return "—";
    const r = db.staffRoles.find((r) => r.id === u.staffRoleId);
    return r ? `${u.name} (${r.name})` : u.name;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Materials</h1>
          <p className="text-sm text-muted-foreground">Define what each student is required to bring or pay, and who checks it.</p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button variant="gradient"><Plus className="mr-2 h-4 w-4" /> Add Material</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add material</DialogTitle></DialogHeader>
              {staffList.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No staff members yet. <Link to="/app/settings" className="text-primary underline">Add a staff member</Link> first so you can assign who checks this material.
                </div>
              ) : (
                <div className="space-y-3">
                  <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mosquito Net" /></div>
                  <div>
                    <Label>Checked by (staff)</Label>
                    <Select value={assignedStaffId} onValueChange={setAssignedStaffId}>
                      <SelectTrigger><SelectValue placeholder="Select staff member" /></SelectTrigger>
                      <SelectContent>
                        {staffList.map((s) => {
                          const r = db.staffRoles.find((rr) => rr.id === s.staffRoleId);
                          return (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}{r ? ` — ${r.name}` : ""}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <DialogFooter><Button onClick={add} variant="gradient" disabled={staffList.length === 0}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" /> All materials</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Checked by</TableHead><TableHead>Tracked rows</TableHead>{canEdit && <TableHead></TableHead>}</TableRow></TableHeader>
            <TableBody>
              {materials.length === 0 && (
                <TableRow><TableCell colSpan={canEdit ? 4 : 3} className="text-center text-sm text-muted-foreground py-8">No materials yet.</TableCell></TableRow>
              )}
              {materials.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell><Badge variant="secondary">{staffLabel(m.assignedStaffId)}</Badge></TableCell>
                  <TableCell>{db.tracking.filter((t) => t.materialId === m.id).length}</TableCell>
                  {canEdit && <TableCell><Button size="icon" variant="ghost" onClick={() => remove(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
