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
  | "manage_materials"
  | "manage_fees"
  | "manage_logistics"
  | "view_reports";

export const PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: ["manage_schools", "manage_staff", "manage_students", "manage_materials", "manage_fees", "manage_logistics", "view_reports"],
  school_admin: ["manage_staff", "manage_students", "manage_materials", "manage_fees", "manage_logistics", "view_reports"],
  finance_staff: ["manage_fees", "view_reports"],
  logistics_staff: ["manage_logistics", "view_reports"],
  academic_staff: ["manage_students", "view_reports"],
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

export type Student = {
  id: string;
  schoolId: string;
  name: string;
  className: string;
};

export type MaterialKind = "fee" | "logistics" | "academic";

export type Material = {
  id: string;
  schoolId: string;
  name: string;
  kind: MaterialKind;
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
  students: Student[];
  materials: Material[];
  tracking: Tracking[];
};

const KEY = "acadex_db_v2";
const SESSION = "acadex_session_v1";

const uid = () => Math.random().toString(36).slice(2, 10);


function seed(): DB {
  const users: User[] = [
    { id: "u_super", email: "admin@acadex.com", password: "admin123", name: "Super Admin", role: "super_admin", schoolId: null },
  ];
  return { users, schools: [], students: [], materials: [], tracking: [] };
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
    return JSON.parse(raw) as DB;
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

export function login(email: string, password: string): User | null {
  const db = loadDB();
  const u = db.users.find((x) => x.email.toLowerCase() === email.toLowerCase() && x.password === password);
  if (u) setSession(u);
  return u ?? null;
}

export function hasPermission(user: User | null, perm: Permission): boolean {
  if (!user) return false;
  return PERMISSIONS[user.role].includes(perm);
}

export { uid };
