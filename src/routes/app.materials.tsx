import { createFileRoute } from "@tanstack/react-router";
import { useDB, useSession } from "@/hooks/use-acadex";
import { loadDB, saveDB, uid, hasPermission, type MaterialKind } from "@/lib/store";
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

export const Route = createFileRoute("/app/materials")({
  head: () => ({ meta: [{ title: "Materials — Acadex" }] }),
  component: MaterialsPage,
});

const KIND_LABEL: Record<MaterialKind, string> = { fee: "Fee", logistics: "Logistics", academic: "Academic" };

function MaterialsPage() {
  const db = useDB();
  const user = useSession()!;
  const canEdit = hasPermission(user, "manage_materials") || hasPermission(user, "manage_fees") || hasPermission(user, "manage_logistics");
  const schoolId = user.schoolId ?? db.schools[0]?.id;
  const materials = db.materials.filter((m) => user.role === "super_admin" || m.schoolId === user.schoolId);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<MaterialKind>("logistics");

  function add() {
    if (!name) return toast.error("Enter material name");
    const next = loadDB();
    const id = "m_" + uid();
    next.materials.push({ id, schoolId: schoolId!, name, kind });
    next.students.filter((s) => s.schoolId === schoolId).forEach((s) => {
      next.tracking.push({ id: "tr_" + uid(), schoolId: schoolId!, studentId: s.id, materialId: id, status: "pending", promisedDate: null, updatedAt: new Date().toISOString() });
    });
    saveDB(next);
    setOpen(false); setName("");
    toast.success("Material added");
  }

  function remove(id: string) {
    const next = loadDB();
    next.materials = next.materials.filter((m) => m.id !== id);
    next.tracking = next.tracking.filter((t) => t.materialId !== id);
    saveDB(next);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Materials</h1>
          <p className="text-sm text-muted-foreground">Define what each student is required to bring or pay.</p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="bg-[var(--gradient-primary)]"><Plus className="mr-2 h-4 w-4" /> Add Material</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add material</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mosquito Net" /></div>
                <div>
                  <Label>Type</Label>
                  <Select value={kind} onValueChange={(v) => setKind(v as MaterialKind)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fee">Fee</SelectItem>
                      <SelectItem value="logistics">Logistics</SelectItem>
                      <SelectItem value="academic">Academic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter><Button onClick={add} className="bg-[var(--gradient-primary)]">Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" /> All materials</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Tracked rows</TableHead>{canEdit && <TableHead></TableHead>}</TableRow></TableHeader>
            <TableBody>
              {materials.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell><Badge variant="secondary">{KIND_LABEL[m.kind]}</Badge></TableCell>
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
