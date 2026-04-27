import { createFileRoute } from "@tanstack/react-router";
import { useDB, useSession } from "@/hooks/use-acadex";
import { loadDB, saveDB, uid, hasPermission, ROLE_LABEL, type Role } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Plus, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { resetDB } from "@/lib/store";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings — Acadex" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const db = useDB();
  const user = useSession()!;
  const canManageStaff = hasPermission(user, "manage_staff");
  const staff = db.users.filter((u) => user.role === "super_admin" ? u.role !== "super_admin" : u.schoolId === user.schoolId && u.id !== user.id);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("finance_staff");

  function addStaff() {
    if (!name || !email || !password) return toast.error("Fill all fields");
    const next = loadDB();
    if (next.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) return toast.error("Email already exists");
    next.users.push({ id: "u_" + uid(), name, email, password, role, schoolId: user.schoolId });
    saveDB(next);
    setOpen(false); setName(""); setEmail(""); setPassword("");
    toast.success("Staff added");
  }

  function removeStaff(id: string) {
    const next = loadDB();
    next.users = next.users.filter((u) => u.id !== id);
    saveDB(next);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account, staff, and workspace.</p>
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div><Label>Name</Label><Input value={user.name} disabled /></div>
          <div><Label>Email</Label><Input value={user.email} disabled /></div>
          <div><Label>Role</Label><Input value={ROLE_LABEL[user.role]} disabled /></div>
        </CardContent>
      </Card>

      {canManageStaff && (
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Staff accounts</CardTitle>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm" variant="gradient"><Plus className="mr-2 h-4 w-4" /> Add Staff</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add staff member</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                  <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                  <div><Label>Password</Label><Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                  <div>
                    <Label>Role</Label>
                    <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {user.role === "super_admin" && <SelectItem value="school_admin">School Admin</SelectItem>}
                        <SelectItem value="finance_staff">Finance Staff</SelectItem>
                        <SelectItem value="logistics_staff">Logistics Staff</SelectItem>
                        <SelectItem value="academic_staff">Academic Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter><Button onClick={addStaff} variant="gradient">Add</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {staff.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell><Badge variant="secondary">{ROLE_LABEL[u.role]}</Badge></TableCell>
                    <TableCell><Button size="icon" variant="ghost" onClick={() => removeStaff(u.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card className="border-destructive/30 shadow-[var(--shadow-card)]">
        <CardHeader><CardTitle className="text-base text-destructive">Danger zone</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">Reset all demo data back to the seeded defaults.</p>
          <Button variant="outline" onClick={() => { resetDB(); toast.success("Demo data reset"); }}>
            <RotateCcw className="mr-2 h-4 w-4" /> Reset demo data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
