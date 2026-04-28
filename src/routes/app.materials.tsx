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
import { Link } from "@tanstack/react-router";

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
  const categories = db.categories.filter((c) => user.role === "super_admin" || c.schoolId === user.schoolId);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");

  function add() {
    if (!name) return toast.error("Enter material name");
    if (!categoryId) return toast.error("Select a category");
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return toast.error("Category not found");
    const next = loadDB();
    const id = "m_" + uid();
    next.materials.push({ id, schoolId: cat.schoolId, name, kind: cat.kind, categoryId: cat.id });
    next.students.filter((s) => s.schoolId === cat.schoolId).forEach((s) => {
      next.tracking.push({ id: "tr_" + uid(), schoolId: cat.schoolId, studentId: s.id, materialId: id, status: "pending", promisedDate: null, updatedAt: new Date().toISOString() });
    });
    saveDB(next);
    setOpen(false); setName(""); setCategoryId("");
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
            <DialogTrigger asChild><Button variant="gradient"><Plus className="mr-2 h-4 w-4" /> Add Material</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add material</DialogTitle></DialogHeader>
              {categories.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No categories yet. <Link to="/app/categories" className="text-primary underline">Create a category</Link> first to use as the material type.
                </div>
              ) : (
                <div className="space-y-3">
                  <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mosquito Net" /></div>
                  <div>
                    <Label>Category (type)</Label>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                      <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name} — {KIND_LABEL[c.kind]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <DialogFooter><Button onClick={add} variant="gradient" disabled={categories.length === 0}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" /> All materials</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Type</TableHead><TableHead>Tracked rows</TableHead>{canEdit && <TableHead></TableHead>}</TableRow></TableHeader>
            <TableBody>
              {materials.map((m) => {
                const cat = db.categories.find((c) => c.id === m.categoryId);
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell>{cat?.name ?? "—"}</TableCell>
                    <TableCell><Badge variant="secondary">{KIND_LABEL[m.kind]}</Badge></TableCell>
                    <TableCell>{db.tracking.filter((t) => t.materialId === m.id).length}</TableCell>
                    {canEdit && <TableCell><Button size="icon" variant="ghost" onClick={() => remove(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>}
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
