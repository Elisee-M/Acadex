// Local-first demo store. Persists in localStorage.
// Multi-tenant: data scoped by schoolId. Super admin sees all.

// System roles only. Custom staff roles (e.g. "Finance", "Logistics") live in
// the StaffRole table and are referenced via user.staffRoleId.
export type Role = "super_admin" | "school_admin" | "staff";

export type Permission =
  | "manage_schools"
  | "manage_staff"
  | "manage_students"
  | "manage_classes"
  | "manage_materials"
  | "manage_roles"
  | "view_reports";

export const PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: ["manage_schools", "manage_staff", "manage_students", "manage_classes", "manage_materials", "manage_roles", "view_reports"],
  school_admin: ["manage_staff", "manage_students", "manage_classes", "manage_materials", "manage_roles", "view_reports"],
  staff: ["view_reports"],
};

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Admin",
  school_admin: "School Admin",
  staff: "Staff",
};

export type User = {
  id: string;
  email: string;
  username?: string;
  password: string;
  name: string;
  role: Role;
  schoolId: string | null;     // null for super admin
  staffRoleId?: string | null; // ref to StaffRole, only when role === "staff"
};

export type School = {
  id: string;
  name: string;
  location: string;
  createdAt: string;
};

// Custom staff role created by a school admin (e.g. "Finance", "Logistics", "Dean")
export type StaffRole = {
  id: string;
  schoolId: string;
  name: string;
  createdAt: string;
};

// Class level: L (Levels with trades, e.g. L3-L5) or S (Senior, e.g. S1-S5, no trade)
export type ClassLevel = "L3" | "L4" | "L5" | "S1" | "S2" | "S3" | "S4" | "S5";

export type SchoolClass = {
  id: string;
  schoolId: string;
  level: ClassLevel;
  trade?: string | null;
  abbreviation?: string | null;
  createdAt: string;
};

export function classDisplayName(c: Pick<SchoolClass, "level" | "abbreviation" | "trade">): string {
  if (c.level.startsWith("L") && c.abbreviation) return `${c.level} ${c.abbreviation}`;
  if (c.level.startsWith("L") && c.trade) return `${c.level} ${c.trade}`;
  return c.level;
}

export type Student = {
  id: string;
  schoolId: string;
  name: string;
  classId: string;
  className?: string;
};

export type Material = {
  id: string;
  schoolId: string;
  name: string;
  assignedStaffId: string; // which staff user is responsible for checking this material
};

export type TrackingStatus = "completed" | "pending" | "overdue";

export type Tracking = {
  id: string;
  schoolId: string;
  studentId: string;
  materialId: string;
  status: TrackingStatus;
  promisedDate: string | null;
  updatedAt: string;
};

type DB = {
  users: User[];
  schools: School[];
  staffRoles: StaffRole[];
  classes: SchoolClass[];
  students: Student[];
  materials: Material[];
  tracking: Tracking[];
};

const KEY = "acadex_db_v5";
const SESSION = "acadex_session_v1";

const uid = () => Math.random().toString(36).slice(2, 10);

function seed(): DB {
  const users: User[] = [
    { id: "u_super", email: "admin@acadex.com", username: "admin", password: "admin123", name: "Super Admin", role: "super_admin", schoolId: null },
  ];
  return { users, schools: [], staffRoles: [], classes: [], students: [], materials: [], tracking: [] };
}

export function loadDB(): DB {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    const parsed = JSON.parse(raw) as DB;
    if (!parsed.classes) parsed.classes = [];
    if (!parsed.staffRoles) parsed.staffRoles = [];
    return parsed;
  } catch {
    const s = seed();
    localStorage.setItem(KEY, JSON.stringify(s));
    return s;
  }
}

export function saveDB(db: DB) {
  localStorage.setItem(KEY, JSON.stringify(db));
  window.dispatchEvent(new Event("acadex:db"));
}

export function resetDB() {
  localStorage.removeItem(KEY);
  loadDB();
}

export function getSession(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION);
  if (!raw) return null;
  try { return JSON.parse(raw) as User; } catch { return null; }
}

export function setSession(u: User | null) {
  if (u) localStorage.setItem(SESSION, JSON.stringify(u));
  else localStorage.removeItem(SESSION);
  window.dispatchEvent(new Event("acadex:session"));
}

export function login(identifier: string, password: string): User | null {
  const db = loadDB();
  const id = identifier.trim().toLowerCase();
  const u = db.users.find((x) =>
    (x.email.toLowerCase() === id || (x.username ?? "").toLowerCase() === id) &&
    x.password === password
  );
  if (u) setSession(u);
  return u ?? null;
}

export function changePassword(userId: string, currentPassword: string, newPassword: string): { ok: boolean; error?: string } {
  const db = loadDB();
  const u = db.users.find((x) => x.id === userId);
  if (!u) return { ok: false, error: "User not found" };
  if (u.password !== currentPassword) return { ok: false, error: "Current password is incorrect" };
  if (!newPassword || newPassword.length < 6) return { ok: false, error: "New password must be at least 6 characters" };
  u.password = newPassword;
  saveDB(db);
  const sess = getSession();
  if (sess && sess.id === userId) setSession(u);
  return { ok: true };
}

export function hasPermission(user: User | null, perm: Permission): boolean {
  if (!user) return false;
  return PERMISSIONS[user.role].includes(perm);
}

// Display the effective role label of a user (custom staff role name if any).
export function userRoleLabel(u: User, db: Pick<DB, "staffRoles">): string {
  if (u.role === "staff") {
    const r = db.staffRoles.find((x) => x.id === u.staffRoleId);
    return r ? r.name : "Staff";
  }
  return ROLE_LABEL[u.role];
}

export { uid };
