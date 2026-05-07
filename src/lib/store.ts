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
  photo?: string | null;       // optional data URL
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
  parentPhone: string;
  photo?: string | null; // data URL
};

export type Material = {
  id: string;
  schoolId: string;
  name: string;
  // One or more staff users responsible for checking this material.
  assignedStaffIds: string[];
};

export type TrackingStatus = "completed" | "pending" | "overdue";

export type Term = "T1" | "T2" | "T3";
export const TERM_LABEL: Record<Term, string> = { T1: "Term 1", T2: "Term 2", T3: "Term 3" };

export type Tracking = {
  id: string;
  schoolId: string;
  studentId: string;
  materialId: string;
  status: TrackingStatus;
  promisedDate: string | null;
  updatedAt: string;
  academicYear: number; // e.g. 2026
  term: Term;
};

// Default current academic year/term (heuristic based on month).
export function currentAcademicYear(d: Date = new Date()): number {
  return d.getFullYear();
}
export function currentTerm(d: Date = new Date()): Term {
  const m = d.getMonth() + 1; // 1..12
  if (m >= 1 && m <= 4) return "T1";
  if (m >= 5 && m <= 8) return "T2";
  return "T3";
}

export type AuditEntry = {
  id: string;
  schoolId: string | null;
  actorId: string;
  actorName: string;
  action: string;
  target?: string;
  details?: string;
  at: string;
};

export type TermArchive = {
  id: string;
  schoolId: string;
  academicYear: number;
  term: Term;
  archivedAt: string;
  archivedBy: string;
  tracking: Tracking[];
  studentsCount: number;
  materialsCount: number;
  summary: { completed: number; pending: number; overdue: number };
};

type DB = {
  users: User[];
  schools: School[];
  staffRoles: StaffRole[];
  classes: SchoolClass[];
  students: Student[];
  materials: Material[];
  tracking: Tracking[];
  audit: AuditEntry[];
  archives: TermArchive[];
};

const KEY = "acadex_db_v8";
const SESSION = "acadex_session_v1";

const uid = () => Math.random().toString(36).slice(2, 10);

function seed(): DB {
  const users: User[] = [
    { id: "u_super", email: "admin@acadex.com", username: "admin", password: "admin123", name: "Super Admin", role: "super_admin", schoolId: null },
  ];
  return { users, schools: [], staffRoles: [], classes: [], students: [], materials: [], tracking: [], audit: [], archives: [] };
}

export function loadDB(): DB {
  if (typeof window === "undefined") return seed();
  try {
    // migrate from older keys
    const oldRaw = localStorage.getItem("acadex_db_v7");
    if (oldRaw && !localStorage.getItem(KEY)) {
      try {
        const parsed = JSON.parse(oldRaw);
        parsed.audit = parsed.audit ?? [];
        parsed.archives = parsed.archives ?? [];
        localStorage.setItem(KEY, JSON.stringify(parsed));
      } catch {}
    }
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    const parsed = JSON.parse(raw) as DB;
    if (!parsed.classes) parsed.classes = [];
    if (!parsed.staffRoles) parsed.staffRoles = [];
    if (!parsed.audit) parsed.audit = [];
    if (!parsed.archives) parsed.archives = [];
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

// ===== Audit log =====
export function logAudit(action: string, target?: string, details?: string) {
  const sess = getSession();
  if (!sess) return;
  const db = loadDB();
  db.audit = db.audit ?? [];
  db.audit.unshift({
    id: "au_" + uid(),
    schoolId: sess.schoolId,
    actorId: sess.id,
    actorName: sess.name,
    action,
    target,
    details,
    at: new Date().toISOString(),
  });
  // cap to last 1000 entries
  if (db.audit.length > 1000) db.audit = db.audit.slice(0, 1000);
  saveDB(db);
}

// ===== Term archive & rollover =====
const LEVEL_ORDER: ClassLevel[] = ["L3", "L4", "L5", "S1", "S2", "S3", "S4", "S5"];
function nextLevel(c: ClassLevel): ClassLevel | null {
  // L3->L4->L5 (then graduate). S1->S2..->S5 (then graduate).
  if (c === "L3") return "L4";
  if (c === "L4") return "L5";
  if (c === "L5") return null;
  if (c === "S1") return "S2";
  if (c === "S2") return "S3";
  if (c === "S3") return "S4";
  if (c === "S4") return "S5";
  return null;
}

export function archiveTerm(opts: { schoolId: string; academicYear: number; term: Term; promote?: boolean }): { ok: boolean; archiveId?: string; error?: string } {
  const sess = getSession();
  if (!sess) return { ok: false, error: "Not signed in" };
  const db = loadDB();
  const inScope = (t: Tracking) => t.schoolId === opts.schoolId && t.academicYear === opts.academicYear && t.term === opts.term;
  const tracking = db.tracking.filter(inScope);
  if (tracking.length === 0) return { ok: false, error: "Nothing to archive for this period" };

  const archive: TermArchive = {
    id: "ar_" + uid(),
    schoolId: opts.schoolId,
    academicYear: opts.academicYear,
    term: opts.term,
    archivedAt: new Date().toISOString(),
    archivedBy: sess.name,
    tracking: JSON.parse(JSON.stringify(tracking)),
    studentsCount: db.students.filter((s) => s.schoolId === opts.schoolId).length,
    materialsCount: db.materials.filter((m) => m.schoolId === opts.schoolId).length,
    summary: {
      completed: tracking.filter((t) => t.status === "completed").length,
      pending: tracking.filter((t) => t.status === "pending").length,
      overdue: tracking.filter((t) => t.status === "overdue").length,
    },
  };
  db.archives = db.archives ?? [];
  db.archives.unshift(archive);

  // remove archived tracking from live data
  db.tracking = db.tracking.filter((t) => !inScope(t));

  // optional promotion
  if (opts.promote) {
    const graduating: string[] = [];
    db.students = db.students.map((s) => {
      if (s.schoolId !== opts.schoolId) return s;
      const cls = db.classes.find((c) => c.id === s.classId);
      if (!cls) return s;
      const nl = nextLevel(cls.level);
      if (!nl) { graduating.push(s.id); return s; }
      // find a class at this school with same trade/abbr at the next level
      const newCls = db.classes.find((c) => c.schoolId === opts.schoolId && c.level === nl && (c.trade ?? null) === (cls.trade ?? null) && (c.abbreviation ?? null) === (cls.abbreviation ?? null));
      if (!newCls) return s;
      return { ...s, classId: newCls.id, className: classDisplayName(newCls) };
    });
    // remove graduates
    db.students = db.students.filter((s) => !graduating.includes(s.id));
    db.tracking = db.tracking.filter((t) => !graduating.includes(t.studentId));
  }

  saveDB(db);
  // log
  logAudit("term.archive", `${opts.academicYear} · ${opts.term}`, opts.promote ? "with promotion" : undefined);
  return { ok: true, archiveId: archive.id };
}
