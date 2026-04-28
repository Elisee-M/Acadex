// Local-first demo store. Persists in localStorage.
// Multi-tenant: data scoped by schoolId. Super admin sees all.

export type Role =
  | "super_admin"
  | "school_admin"
  | "finance_staff"
  | "logistics_staff"
  | "academic_staff";

export type Permission =
  | "manage_schools"
  | "manage_staff"
  | "manage_students"
  | "manage_classes"
  | "manage_materials"
  | "manage_fees"
  | "manage_logistics"
  | "view_reports";

export const PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: ["manage_schools", "manage_staff", "manage_students", "manage_classes", "manage_materials", "manage_fees", "manage_logistics", "view_reports"],
  school_admin: ["manage_staff", "manage_students", "manage_classes", "manage_materials", "manage_fees", "manage_logistics", "view_reports"],
  finance_staff: ["manage_fees", "view_reports"],
  logistics_staff: ["manage_logistics", "view_reports"],
  academic_staff: ["view_reports"],
};

// Map a staff role to the material kind they are responsible for checking
export const ROLE_TO_MATERIAL_KIND: Partial<Record<Role, "fee" | "logistics" | "academic">> = {
  finance_staff: "fee",
  logistics_staff: "logistics",
  academic_staff: "academic",
};

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Admin",
  school_admin: "School Admin",
  finance_staff: "Finance Staff",
  logistics_staff: "Logistics Staff",
  academic_staff: "Academic Staff",
};

export type User = {
  id: string;
  email: string;
  username?: string;
  password: string;
  name: string;
  role: Role;
  schoolId: string | null; // null for super admin
};

export type School = {
  id: string;
  name: string;
  location: string;
  createdAt: string;
};

// Class level: L (Levels with trades, e.g. L3-L5) or S (Senior, e.g. S1-S5, no trade)
export type ClassLevel = "L3" | "L4" | "L5" | "S1" | "S2" | "S3" | "S4" | "S5";

export type SchoolClass = {
  id: string;
  schoolId: string;
  level: ClassLevel;
  trade?: string | null;        // full trade name e.g. "Computer System and Architecture" (only for L*)
  abbreviation?: string | null; // short e.g. "CSA"
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
  classId: string;       // reference to SchoolClass
  className?: string;    // legacy, kept for backward compat
};

export type MaterialKind = "fee" | "logistics" | "academic";

export type MaterialCategory = {
  id: string;
  schoolId: string;
  name: string;          // custom display name e.g. "Uniform", "Tuition", "Books"
  kind: MaterialKind;    // which staff role checks materials in this category
  createdAt: string;
};

export type Material = {
  id: string;
  schoolId: string;
  name: string;
  kind: MaterialKind;       // mirrors category.kind for fast filtering
  categoryId?: string | null;
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
  classes: SchoolClass[];
  students: Student[];
  categories: MaterialCategory[];
  materials: Material[];
  tracking: Tracking[];
};

const KEY = "acadex_db_v4";
const SESSION = "acadex_session_v1";

const uid = () => Math.random().toString(36).slice(2, 10);


function seed(): DB {
  const users: User[] = [
    { id: "u_super", email: "admin@acadex.com", username: "admin", password: "admin123", name: "Super Admin", role: "super_admin", schoolId: null },
  ];
  return { users, schools: [], classes: [], students: [], categories: [], materials: [], tracking: [] };
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
    if (!parsed.categories) parsed.categories = [];
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

// Login accepts either email or username
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
  // refresh session if it's the current user
  const sess = getSession();
  if (sess && sess.id === userId) setSession(u);
  return { ok: true };
}

export function hasPermission(user: User | null, perm: Permission): boolean {
  if (!user) return false;
  return PERMISSIONS[user.role].includes(perm);
}

export { uid };
