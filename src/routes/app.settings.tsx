import { createFileRoute } from "@tanstack/react-router";
import { useDB, useSession } from "@/hooks/use-acadex";
import { userRoleLabel, changePassword, resetDB } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { RotateCcw, KeyRound } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings — Acadex" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const db = useDB();
  const user = useSession()!;

  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

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
        <p className="text-sm text-muted-foreground">Manage your account and workspace.</p>
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
