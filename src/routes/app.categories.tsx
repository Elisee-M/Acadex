import { createFileRoute, redirect } from "@tanstack/react-router";
import { useDB, useSession } from "@/hooks/use-acadex";
import { loadDB, saveDB, uid, getSession, type MaterialKind, type MaterialCategory } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Plus, Trash2, Pencil, Tag } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/categories")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const u = getSession();
      if (!u) throw redirect({ to: "/login" });
      if (u.role !== "school_admin" && u.role !== "super_admin")
        throw redirect({ to: "/app/dashboard" });
    }
  },
  head: () => ({ meta: [{ title: "Material Categories — Acadex" }] }),
  component: CategoriesPage,
});

const KIND_LABEL: Record<MaterialKind, string> = { fee: "Fee", logistics: "Logistics", academic: "Academic" };

function CategoriesPage() {
  const db = useDB();
  const user = useSession()!;
  const schoolId = user.schoolId ?? db.schools[0]?.id;

  const categories = db.categories.filter((c) => user.role === "super_admin" || c.schoolId === user.schoolId);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MaterialCategory | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<MaterialKind>("logistics");

  function openCreate() {
    setEditing(null); setName(""); setKind("logistics"); setOpen(true);
  }
  function openEdit(c: MaterialCategory) {
    setEditing(c); setName(c.name); setKind(c.kind); setOpen(true);
  }

  function save() {
    if (!name.trim()) return toast.error("Enter a category name");
    if (!schoolId) return toast.error("No school context");
    const next = loadDB();
    if (editing) {
      const c = next.categories.find((x) => x.id === editing.id);
      if (!c) return;
      c.name = name.trim();
      c.kind = kind;
      // propagate kind to its materials so staff routing stays correct
      next.materials.filter((m) => m.categoryId === c.id).forEach((m) => { m.kind = kind; });
      saveDB(next);
      toast.success("Category updated");
    } else {
      const dup = next.categories.find((c) => c.schoolId === schoolId && c.name.toLowerCase() === name.trim().toLowerCase());
      if (dup) return toast.error("A category with that name already exists");
      next.categories.push({
        id: "cat_" + uid(),
        schoolId: schoolId!,
        name: name.trim(),
        kind,
        createdAt: new Date().toISOString(),
      });
      saveDB(next);
      toast.success("Category created");
    }
    setOpen(false);
  }

  function remove(c: MaterialCategory) {
    const used = loadDB().materials.some((m) => m.categoryId === c.id);
    if (used) return toast.error("Cannot delete: materials are using this category");
    const next = loadDB();
    next.categories = next.categories.filter((x) => x.id !== c.id);
    saveDB(next);
    toast.success("Category deleted");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Material Categories</h1>
          <p className="text-sm text-muted-foreground">
            Define the categories (types) used when creating materials. Each category is checked by the staff role you assign.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="gradient" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit category" : "Add category"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Category name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Uniform, Tuition, Books" />
              </div>
              <div>
                <Label>Checked by (staff role)</Label>
                <Select value={kind} onValueChange={(v) => setKind(v as MaterialKind)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fee">Finance Staff (Fee)</SelectItem>
                    <SelectItem value="logistics">Logistics Staff</SelectItem>
                    <SelectItem value="academic">Academic Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button onClick={save} variant="gradient">Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Tag className="h-4 w-4" /> All categories</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Checked by</TableHead>
                <TableHead>Materials</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                  No categories yet. Create one to use as a material type.
                </TableCell></TableRow>
              )}
              {categories.map((c) => {
                const count = db.materials.filter((m) => m.categoryId === c.id).length;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell><Badge variant="secondary">{KIND_LABEL[c.kind]}</Badge></TableCell>
                    <TableCell>{count}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                          <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(c)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
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
