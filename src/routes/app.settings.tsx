import { createFileRoute } from "@tanstack/react-router";
import { useDB, useSession } from "@/hooks/use-acadex";
import { loadDB, saveDB, uid, hasPermission, ROLE_LABEL, userRoleLabel, type Role, changePassword } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Plus, Trash2, RotateCcw, KeyRound, Pencil } from "lucide-react";
import { toast } from "sonner";
import { resetDB } from "@/lib/store";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings — Acadex" }] }),
  component: SettingsPage,
});

const SCHOOL_ADMIN_OPTION = "__school_admin__";

function SettingsPage() {
  const db = useDB();
  const user = useSession()!;
  const canManageStaff = hasPermission(user, "manage_staff");
  const staff = db.users.filter((u) =>
    user.role === "super_admin"
      ? u.role !== "super_admin"
      : u.schoolId === user.schoolId && u.id !== user.id
  );

  const availableRoles = db.staffRoles.filter((r) =>
    user.role === "super_admin" ? true : r.schoolId === user.schoolId
  );

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [roleSelection, setRoleSelection] = useState<string>("");

  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Photo must be under 2MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setPhoto(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  function resetForm() {
    setEditingId(null); setName(""); setEmail(""); setUsername(""); setPassword(""); setPhoto(null); setRoleSelection("");
  }

  function openCreate() {
    resetForm(); setOpen(true);
  }

  function openEdit(id: string) {
    const u = db.users.find((x) => x.id === id);
    if (!u) return;
    setEditingId(id);
    setName(u.name);
    setEmail(u.email);
    setUsername(u.username || "");
    setPassword(""); // leave blank = unchanged
    setPhoto(u.photo ?? null);
    setRoleSelection(u.role === "school_admin" ? SCHOOL_ADMIN_OPTION : (u.staffRoleId || ""));
    setOpen(true);
  }

  function saveStaff() {
    if (!name || !email) return toast.error("Fill name and email");
    if (!roleSelection) return toast.error("Select a role");
    const next = loadDB();
    const emailLower = email.toLowerCase();
    const usernameLower = username.trim().toLowerCase();

    let role: Role;
    let staffRoleId: string | null = null;
    if (roleSelection === SCHOOL_ADMIN_OPTION) { role = "school_admin"; }
    else { role = "staff"; staffRoleId = roleSelection; }

    if (editingId) {
      const u = next.users.find((x) => x.id === editingId);
      if (!u) return toast.error("User not found");
      if (next.users.some((x) => x.id !== editingId && x.email.toLowerCase() === emailLower)) return toast.error("Email already exists");
      if (usernameLower && next.users.some((x) => x.id !== editingId && (x.username ?? "").toLowerCase() === usernameLower)) return toast.error("Username already taken");
      u.name = name;
      u.email = email;
      u.username = username.trim() || undefined;
      if (password) u.password = password;
      u.role = role;
      u.staffRoleId = staffRoleId;
      u.photo = photo;
      saveDB(next);
      setOpen(false); resetForm();
      toast.success("Staff updated");
      return;
    }

    if (!password) return toast.error("Set a password");
    if (next.users.some((u) => u.email.toLowerCase() === emailLower)) return toast.error("Email already exists");
    if (usernameLower && next.users.some((u) => (u.username ?? "").toLowerCase() === usernameLower)) return toast.error("Username already taken");

    next.users.push({
      id: "u_" + uid(),
      name,
      email,
      username: username.trim() || undefined,
      password,
      role,
      schoolId: user.schoolId,
      staffRoleId,
      photo,
    });
    saveDB(next);
    setOpen(false); resetForm();
    toast.success("Staff added");
  }

  function removeStaff(id: string) {
    const next = loadDB();
    next.users = next.users.filter((u) => u.id !== id);
    // also unassign from materials
    next.materials.forEach((m) => { m.assignedStaffIds = m.assignedStaffIds.filter((sid) => sid !== id); });
    saveDB(next);
  }

  function submitPasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPwd !== confirmPwd) return toast.error("New passwords do not match");
    const res = changePassword(user.id, curPwd, newPwd);
    if (!res.ok) return toast.error(res.error || "Could not change password");
    setCurPwd(""); setNewPwd(""); setConfirmPwd("");
    toast.success("Password updated");
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
          <div><Label>Username</Label><Input value={user.username || "—"} disabled /></div>
          <div><Label>Role</Label><Input value={userRoleLabel(user, db)} disabled /></div>
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-4 w-4" /> Change password</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submitPasswordChange} className="grid gap-4 md:grid-cols-3">
            <div><Label>Current password</Label><Input type="password" value={curPwd} onChange={(e) => setCurPwd(e.target.value)} required /></div>
            <div><Label>New password</Label><Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required /></div>
            <div><Label>Confirm new password</Label><Input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} required /></div>
            <div className="md:col-span-3">
              <Button type="submit" variant="gradient">Update password</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {canManageStaff && (
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Staff accounts</CardTitle>
            <Button size="sm" variant="gradient" onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add Staff</Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Username</TableHead><TableHead>Role</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {staff.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {u.photo ? (
                          <img src={u.photo} alt={u.name} className="h-8 w-8 rounded-full object-cover border border-border" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span>{u.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.username || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {u.role === "school_admin" ? ROLE_LABEL.school_admin : userRoleLabel(u, db)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(u.id)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => removeStaff(u.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Edit staff member" : "Add staff member"}</DialogTitle></DialogHeader>
          {availableRoles.length === 0 && user.role !== "super_admin" ? (
            <div className="text-sm text-muted-foreground">
              No staff roles defined yet. <Link to="/app/categories" className="text-primary underline">Create a role</Link> first (e.g. Finance, Logistics) so you can assign one.
            </div>
          ) : (
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><Label>Username (optional)</Label><Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="for sign-in" /></div>
              <div>
                <Label>{editingId ? "Password (leave blank to keep current)" : "Password"}</Label>
                <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={roleSelection} onValueChange={setRoleSelection}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    {user.role === "super_admin" && <SelectItem value={SCHOOL_ADMIN_OPTION}>School Admin</SelectItem>}
                    {availableRoles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Photo (optional)</Label>
                <Input type="file" accept="image/*" onChange={onPhotoChange} />
                {photo && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={photo} alt="Staff preview" className="h-20 w-20 rounded-full object-cover border border-border" />
                    <Button type="button" size="sm" variant="outline" onClick={() => setPhoto(null)}>Remove photo</Button>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={saveStaff} variant="gradient" disabled={availableRoles.length === 0 && user.role !== "super_admin"}>{editingId ? "Save changes" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="border-destructive/30 shadow-[var(--shadow-card)]">
        <CardHeader><CardTitle className="text-base text-destructive">Danger zone</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">Reset all data back to defaults (only Super Admin remains).</p>
          <Button variant="outline" onClick={() => { resetDB(); toast.success("Data reset"); }}>
            <RotateCcw className="mr-2 h-4 w-4" /> Reset data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
