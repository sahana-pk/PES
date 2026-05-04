export type DropdownOption = { id: string; name: string; code?: string };

export type Resource = {
  id: number;
  title: string;
  type: "Video" | "Article" | "GitHub";
  description: string;
  url: string;
  topicId: string;
};

export type Textbook = {
  id: string;
  subjectId?: string;
  title: string;
  fileName?: string;
  url?: string;
  driveFileId?: string;
  status: "approved" | "pending";
  createdAt: string;
};

export type Db = {
  departments: Array<{ id: string; name: string }>;
  semesters: Array<{ id: string; name: string }>;
  subjects: Array<{
    id: string;
    name: string;
    code?: string;
    departmentId: string;
    semesterId: string;
  }>;
  modules: Array<{
    id: string;
    name: string;
    subjectId: string;
  }>;
  topics: Array<{
    id: string;
    name: string;
    moduleId: string;
  }>;
  resources: Resource[];
  // Future: add notes here when you start rendering them.
  notes: Array<{
    id: string;
    topicId: string;
    title: string;
    content: string;
    sourceUrl?: string;
    createdAt: string;
  }>;
  textbooks: Textbook[];
};

let adminSessionInMemory = false;

const FIXED_DEPARTMENTS = [
  { id: "cse", name: "Computer Science and Engineering" },
  { id: "ise", name: "Information Science and Engineering" },
  { id: "ece", name: "Electronics and Communication Engineering" },
  { id: "mechanical", name: "Mechanical Engineering" },
  { id: "physics_cycle", name: "Physics Cycle" },
  { id: "chemistry_cycle", name: "Chemistry Cycle" },
] as const;

/** Internal semester id for departments that do not use 3rd–8th semesters (Physics/Chemistry Cycle). */
export const CYCLE_SEMESTER_ID = "cycle";

const DEPARTMENTS_WITHOUT_SEMESTER = new Set<string>(["physics_cycle", "chemistry_cycle"]);

export function departmentUsesSemesters(departmentId: string): boolean {
  return !DEPARTMENTS_WITHOUT_SEMESTER.has(departmentId);
}

const FIXED_SEMESTERS = [
  { id: "3", name: "3rd Semester" },
  { id: "4", name: "4th Semester" },
  { id: "5", name: "5th Semester" },
  { id: "6", name: "6th Semester" },
  { id: "7", name: "7th Semester" },
  { id: "8", name: "8th Semester" },
] as const;

const seedDb: Db = {
  departments: [...FIXED_DEPARTMENTS],
  semesters: [...FIXED_SEMESTERS],
  // Dummy seeded hierarchy for now (you can add more later).
  subjects: [
    // CSE - 3rd semester
    { id: "cse3_ds", name: "Data Structures", code: "CS301", departmentId: "cse", semesterId: "3" },
    { id: "cse3_os", name: "Operating Systems", code: "CS302", departmentId: "cse", semesterId: "3" },
    { id: "cse3_dbms", name: "Database Management Systems", code: "CS303", departmentId: "cse", semesterId: "3" },
    // CSE - 4th semester
    { id: "cse4_cn", name: "Computer Networks", code: "CS401", departmentId: "cse", semesterId: "4" },
    // ISE - 3rd semester
    { id: "ise3_java", name: "Java Programming", code: "IS302", departmentId: "ise", semesterId: "3" },
  ],
  modules: [
    // Data Structures
    { id: "cse3_ds_m1", name: "Module 1: Trees", subjectId: "cse3_ds" },
    { id: "cse3_ds_m2", name: "Module 2: Graphs", subjectId: "cse3_ds" },
    { id: "cse3_ds_m3", name: "Module 3: Hashing", subjectId: "cse3_ds" },
    // Operating Systems
    { id: "cse3_os_m1", name: "Module 1: Process Management", subjectId: "cse3_os" },
    { id: "cse3_os_m2", name: "Module 2: Memory Management", subjectId: "cse3_os" },
    { id: "cse3_os_m3", name: "Module 3: File Systems", subjectId: "cse3_os" },
    // DBMS
    { id: "cse3_dbms_m1", name: "Module 1: ER Model", subjectId: "cse3_dbms" },
    { id: "cse3_dbms_m2", name: "Module 2: SQL", subjectId: "cse3_dbms" },
    // CN
    { id: "cse4_cn_m1", name: "Module 1: Basics & Routing", subjectId: "cse4_cn" },
    // Java
    { id: "ise3_java_m1", name: "Module 1: Java Syntax & OOP", subjectId: "ise3_java" },
  ],
  topics: [
    // Trees
    { id: "cse3_ds_m1_t1", name: "Binary Trees", moduleId: "cse3_ds_m1" },
    { id: "cse3_ds_m1_t2", name: "BST (Binary Search Trees)", moduleId: "cse3_ds_m1" },
    { id: "cse3_ds_m1_t3", name: "AVL Trees", moduleId: "cse3_ds_m1" },
    // Graphs
    { id: "cse3_ds_m2_t1", name: "Graph Traversal (DFS/BFS)", moduleId: "cse3_ds_m2" },
    { id: "cse3_ds_m2_t2", name: "Shortest Path Algorithms", moduleId: "cse3_ds_m2" },
    // Hashing
    { id: "cse3_ds_m3_t1", name: "Hash Functions", moduleId: "cse3_ds_m3" },
    { id: "cse3_ds_m3_t2", name: "Collision Resolution", moduleId: "cse3_ds_m3" },

    // Process Management
    { id: "cse3_os_m1_t1", name: "Process States & Scheduling", moduleId: "cse3_os_m1" },
    { id: "cse3_os_m1_t2", name: "CPU Scheduling Algorithms", moduleId: "cse3_os_m1" },

    // Memory Management
    { id: "cse3_os_m2_t1", name: "Paging & Segmentation", moduleId: "cse3_os_m2" },
    { id: "cse3_os_m2_t2", name: "Page Replacement Policies", moduleId: "cse3_os_m2" },

    // File Systems
    { id: "cse3_os_m3_t1", name: "File Allocation Methods", moduleId: "cse3_os_m3" },
    { id: "cse3_os_m3_t2", name: "Directory Structures", moduleId: "cse3_os_m3" },

    // ER Model
    { id: "cse3_dbms_m1_t1", name: "ER Diagrams & Cardinality", moduleId: "cse3_dbms_m1" },
    { id: "cse3_dbms_m1_t2", name: "Entity Constraints", moduleId: "cse3_dbms_m1" },

    // SQL
    { id: "cse3_dbms_m2_t1", name: "SQL Queries & Joins", moduleId: "cse3_dbms_m2" },
    { id: "cse3_dbms_m2_t2", name: "Indexes & Optimization", moduleId: "cse3_dbms_m2" },

    // CN
    { id: "cse4_cn_m1_t1", name: "Routing Basics", moduleId: "cse4_cn_m1" },
    { id: "cse4_cn_m1_t2", name: "Network Layer Concepts", moduleId: "cse4_cn_m1" },

    // Java
    { id: "ise3_java_m1_t1", name: "Classes, Objects & Inheritance", moduleId: "ise3_java_m1" },
    { id: "ise3_java_m1_t2", name: "Interfaces & Polymorphism", moduleId: "ise3_java_m1" },
  ],
  resources: [
    // cse3_ds_m1_t1
    {
      id: 1,
      title: "Binary Trees Explained - Complete Tutorial",
      type: "Video",
      description:
        "Comprehensive guide covering binary tree fundamentals, traversals, and implementation strategies.",
      url: "https://youtube.com",
      topicId: "cse3_ds_m1_t1",
    },
    {
      id: 2,
      title: "Complete Guide to Binary Trees",
      type: "Article",
      description:
        "In-depth article with visualizations, complexity analysis, and real-world applications.",
      url: "https://medium.com",
      topicId: "cse3_ds_m1_t1",
    },

    // cse3_ds_m1_t2
    {
      id: 3,
      title: "BST Complete Masterclass",
      type: "Video",
      description:
        "Master Binary Search Trees with insertion, deletion, and search operations.",
      url: "https://youtube.com",
      topicId: "cse3_ds_m1_t2",
    },
    {
      id: 4,
      title: "Understanding BST Operations",
      type: "Article",
      description:
        "Detailed explanation of BST properties and efficient implementation techniques.",
      url: "https://geeksforgeeks.org",
      topicId: "cse3_ds_m1_t2",
    },

    // cse3_ds_m2_t1
    {
      id: 5,
      title: "Graph Traversal (DFS/BFS) - In Practice",
      type: "Video",
      description: "Hands-on walkthrough of DFS and BFS with common edge cases.",
      url: "https://youtube.com",
      topicId: "cse3_ds_m2_t1",
    },

    // cse3_os_m1_t1
    {
      id: 6,
      title: "Process States & Scheduling Overview",
      type: "Article",
      description: "Learn the lifecycle of processes and scheduling fundamentals.",
      url: "https://en.wikipedia.org/wiki/Scheduling_(computing)",
      topicId: "cse3_os_m1_t1",
    },

    // cse3_dbms_m2_t1
    {
      id: 7,
      title: "SQL Queries & Joins - Starter Pack",
      type: "GitHub",
      description: "Example-driven SQL learning repo with join examples and exercises.",
      url: "https://github.com",
      topicId: "cse3_dbms_m2_t1",
    },

    // cse4_cn_m1_t1
    {
      id: 8,
      title: "Routing Basics (Network Layer)",
      type: "Article",
      description: "A beginner-friendly explanation of routing and related concepts.",
      url: "https://en.wikipedia.org/wiki/Routing",
      topicId: "cse4_cn_m1_t1",
    },

    // ise3_java_m1_t1
    {
      id: 9,
      title: "Classes, Objects & Inheritance (Java)",
      type: "Video",
      description: "Learn core OOP concepts in Java with examples.",
      url: "https://youtube.com",
      topicId: "ise3_java_m1_t1",
    },
  ],
  notes: [
    {
      id: "note-1",
      topicId: "cse3_ds_m1_t1",
      title: "Binary Trees quick notes",
      content: "Start with traversals (pre/in/post), then move to height/complexity and implementation patterns.",
      sourceUrl: "https://youtube.com",
      createdAt: new Date().toISOString(),
    },
  ],
  textbooks: [],
};

let cachedDb: Db | null = null;

function normalizeDb(db: Db): Db {
  const allowedDepartmentIds = new Set<string>(FIXED_DEPARTMENTS.map((d) => d.id));
  const allowedSemesterIds = new Set<string>(FIXED_SEMESTERS.map((s) => s.id));

  const normalizedSubjects = db.subjects.filter((s) => {
    if (!allowedDepartmentIds.has(s.departmentId)) return false;
    if (DEPARTMENTS_WITHOUT_SEMESTER.has(s.departmentId)) {
      return s.semesterId === CYCLE_SEMESTER_ID;
    }
    return allowedSemesterIds.has(s.semesterId);
  });
  const subjectIds = new Set(normalizedSubjects.map((s) => s.id));

  const normalizedModules = db.modules.filter((m) => subjectIds.has(m.subjectId));
  const moduleIds = new Set(normalizedModules.map((m) => m.id));

  const normalizedTopics = db.topics.filter((t) => moduleIds.has(t.moduleId));
  const topicIds = new Set(normalizedTopics.map((t) => t.id));

  return {
    ...db,
    departments: [...FIXED_DEPARTMENTS],
    semesters: [...FIXED_SEMESTERS],
    subjects: normalizedSubjects,
    modules: normalizedModules,
    topics: normalizedTopics,
    resources: db.resources.filter((r) => topicIds.has(r.topicId)),
    notes: db.notes.filter((n) => topicIds.has(n.topicId)),
    textbooks: (db.textbooks ?? []).filter((t) => subjectIds.has(t.subjectId)),
  };
}

function ensureDb(): Db {
  if (cachedDb) return cachedDb;
  cachedDb = normalizeDb(seedDb);
  return cachedDb;
}

export function resetDbForDevelopment() {
  cachedDb = normalizeDb(seedDb);
}

export function getDepartments(): DropdownOption[] {
  const db = ensureDb();
  return db.departments.map((d) => ({ id: d.id, name: d.name }));
}

export function getSemesters(): DropdownOption[] {
  const db = ensureDb();
  return db.semesters.map((s) => ({ id: s.id, name: s.name }));
}

export function getSubjects(departmentId: string, semesterId: string): DropdownOption[] {
  const db = ensureDb();
  const effectiveSemesterId = DEPARTMENTS_WITHOUT_SEMESTER.has(departmentId) ? CYCLE_SEMESTER_ID : semesterId;
  return db.subjects
    .filter((s) => s.departmentId === departmentId && s.semesterId === effectiveSemesterId)
    .map((s) => ({ id: s.id, name: s.name, code: s.code }));
}

export function getModules(subjectId: string): DropdownOption[] {
  const db = ensureDb();
  return db.modules
    .filter((m) => m.subjectId === subjectId)
    .map((m) => ({ id: m.id, name: m.name }));
}

export function getTopics(moduleId: string): DropdownOption[] {
  const db = ensureDb();
  return db.topics
    .filter((t) => t.moduleId === moduleId)
    .map((t) => ({ id: t.id, name: t.name }));
}

export function getResources(topicId: string): Array<Omit<Resource, "topicId">> {
  const db = ensureDb();
  return db.resources
    .filter((r) => r.topicId === topicId)
    .map((r) => ({ id: r.id, title: r.title, type: r.type, description: r.description, url: r.url }));
}

export function getTopicVideos(topicId: string) {
  return getResources(topicId).filter((r) => r.type === "Video");
}

export function getTopicOnlineResources(topicId: string) {
  return getResources(topicId).filter((r) => r.type !== "Video");
}

export function getTopicNotes(topicId: string) {
  const db = ensureDb();
  return db.notes.filter((n) => n.topicId === topicId);
}

export function getTextbooks(subjectId: string) {
  const db = ensureDb();
  return db.textbooks.filter((t) => t.subjectId === subjectId && t.status === "approved");
}

export function getTextbooksForAdmin(subjectId: string) {
  const db = ensureDb();
  return db.textbooks.filter((t) => t.subjectId === subjectId);
}

export function listPendingTextbookRequests() {
  const db = ensureDb();
  return db.textbooks.filter((t) => t.status === "pending");
}

// -------- Admin access helpers --------
export function getAdminEmail(): string {
  return import.meta.env.VITE_ADMIN_EMAIL ?? "";
}

export function verifyAdminCredentials(email: string, password: string): boolean {
  const allowedEmail = import.meta.env.VITE_ADMIN_EMAIL ?? "";
  const allowedPassword = import.meta.env.VITE_ADMIN_PASSWORD ?? "";
  return email.trim().toLowerCase() === allowedEmail.trim().toLowerCase() && password === allowedPassword;
}

export function setAdminSession(isLoggedIn: boolean) {
  adminSessionInMemory = isLoggedIn;
}

export function isAdminLoggedIn(): boolean {
  return adminSessionInMemory;
}

export function logoutAdmin() {
  setAdminSession(false);
}

// -------- Admin CRUD (subjects/modules/topics) --------
function persist(db: Db) {
  cachedDb = normalizeDb(db);
}

function makeId(prefix: string, name: string) {
  const normalized = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${prefix}_${normalized}_${Date.now()}`;
}

export function listAllSubjects() {
  const db = ensureDb();
  return db.subjects;
}

export function listAllModules() {
  const db = ensureDb();
  return db.modules;
}

export function listAllTopics() {
  const db = ensureDb();
  return db.topics;
}

export function addSubject(input: {
  departmentId: string;
  semesterId: string;
  name: string;
  code?: string;
}) {
  const db = ensureDb();
  const semesterId = DEPARTMENTS_WITHOUT_SEMESTER.has(input.departmentId)
    ? CYCLE_SEMESTER_ID
    : input.semesterId;
  const subject = {
    id: makeId("sub", input.name),
    name: input.name.trim(),
    code: input.code?.trim() || undefined,
    departmentId: input.departmentId,
    semesterId,
  };
  db.subjects.push(subject);
  persist(db);
  return subject;
}

export function updateSubject(
  subjectId: string,
  updates: Partial<Pick<Db["subjects"][number], "name" | "code" | "departmentId" | "semesterId">>,
) {
  const db = ensureDb();
  const subject = db.subjects.find((s) => s.id === subjectId);
  if (!subject) return null;
  if (updates.name !== undefined) subject.name = updates.name.trim();
  if (updates.code !== undefined) subject.code = updates.code?.trim() || undefined;
  if (updates.departmentId !== undefined) subject.departmentId = updates.departmentId;
  if (updates.semesterId !== undefined) subject.semesterId = updates.semesterId;
  if (DEPARTMENTS_WITHOUT_SEMESTER.has(subject.departmentId)) {
    subject.semesterId = CYCLE_SEMESTER_ID;
  }
  persist(db);
  return subject;
}

export function deleteSubject(subjectId: string) {
  const db = ensureDb();
  const moduleIds = db.modules.filter((m) => m.subjectId === subjectId).map((m) => m.id);
  const moduleIdSet = new Set(moduleIds);
  const topicIds = db.topics.filter((t) => moduleIdSet.has(t.moduleId)).map((t) => t.id);
  const topicIdSet = new Set(topicIds);

  db.subjects = db.subjects.filter((s) => s.id !== subjectId);
  db.textbooks = db.textbooks.filter((t) => t.subjectId !== subjectId);
  db.modules = db.modules.filter((m) => m.subjectId !== subjectId);
  db.topics = db.topics.filter((t) => !moduleIdSet.has(t.moduleId));
  db.resources = db.resources.filter((r) => !topicIdSet.has(r.topicId));
  db.notes = db.notes.filter((n) => !topicIdSet.has(n.topicId));
  persist(db);
}

export function addModule(input: { subjectId: string; name: string }) {
  const db = ensureDb();
  const module = {
    id: makeId("mod", input.name),
    name: input.name.trim(),
    subjectId: input.subjectId,
  };
  db.modules.push(module);
  persist(db);
  return module;
}

export function updateModule(
  moduleId: string,
  updates: Partial<Pick<Db["modules"][number], "name" | "subjectId">>,
) {
  const db = ensureDb();
  const module = db.modules.find((m) => m.id === moduleId);
  if (!module) return null;
  if (updates.name !== undefined) module.name = updates.name.trim();
  if (updates.subjectId !== undefined) module.subjectId = updates.subjectId;
  persist(db);
  return module;
}

export function deleteModule(moduleId: string) {
  const db = ensureDb();
  const topicIds = db.topics.filter((t) => t.moduleId === moduleId).map((t) => t.id);
  const topicIdSet = new Set(topicIds);

  db.modules = db.modules.filter((m) => m.id !== moduleId);
  db.topics = db.topics.filter((t) => t.moduleId !== moduleId);
  db.resources = db.resources.filter((r) => !topicIdSet.has(r.topicId));
  db.notes = db.notes.filter((n) => !topicIdSet.has(n.topicId));
  persist(db);
}

export function addTopic(input: { moduleId: string; name: string }) {
  const db = ensureDb();
  const topic = {
    id: makeId("top", input.name),
    name: input.name.trim(),
    moduleId: input.moduleId,
  };
  db.topics.push(topic);
  persist(db);
  return topic;
}

/** Batch-import modules and nested topics in one write (scalable for syllabus imports). */
export function importModulesWithTopics(
  subjectId: string,
  items: Array<{ name: string; topics: string[] }>,
): { modulesAdded: number; topicsAdded: number } {
  const db = ensureDb();
  let modulesAdded = 0;
  let topicsAdded = 0;
  for (const item of items) {
    const moduleName = item.name.trim();
    if (!moduleName) continue;
    const mod = {
      id: makeId("mod", moduleName),
      name: moduleName,
      subjectId,
    };
    db.modules.push(mod);
    modulesAdded++;
    const topicList = Array.isArray(item.topics) ? item.topics : [];
    for (const raw of topicList) {
      const tn = String(raw).trim();
      if (!tn) continue;
      db.topics.push({
        id: makeId("top", tn),
        name: tn,
        moduleId: mod.id,
      });
      topicsAdded++;
    }
  }
  persist(db);
  return { modulesAdded, topicsAdded };
}

export function updateTopic(
  topicId: string,
  updates: Partial<Pick<Db["topics"][number], "name" | "moduleId">>,
) {
  const db = ensureDb();
  const topic = db.topics.find((t) => t.id === topicId);
  if (!topic) return null;
  if (updates.name !== undefined) topic.name = updates.name.trim();
  if (updates.moduleId !== undefined) topic.moduleId = updates.moduleId;
  persist(db);
  return topic;
}

export function deleteTopic(topicId: string) {
  const db = ensureDb();
  db.topics = db.topics.filter((t) => t.id !== topicId);
  db.resources = db.resources.filter((r) => r.topicId !== topicId);
  db.notes = db.notes.filter((n) => n.topicId !== topicId);
  persist(db);
}

function nextResourceId(db: Db) {
  return db.resources.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

export function addTopicVideo(input: {
  topicId: string;
  title: string;
  description: string;
  url: string;
}) {
  const db = ensureDb();
  const resource: Resource = {
    id: nextResourceId(db),
    topicId: input.topicId,
    title: input.title.trim(),
    description: input.description.trim(),
    url: input.url.trim(),
    type: "Video",
  };
  db.resources.push(resource);
  persist(db);
  return resource;
}

export function addTopicOnlineResource(input: {
  topicId: string;
  title: string;
  description: string;
  url: string;
  type?: "Article" | "GitHub";
}) {
  const db = ensureDb();
  const resource: Resource = {
    id: nextResourceId(db),
    topicId: input.topicId,
    title: input.title.trim(),
    description: input.description.trim(),
    url: input.url.trim(),
    type: input.type ?? "Article",
  };
  db.resources.push(resource);
  persist(db);
  return resource;
}

export function deleteResource(resourceId: number) {
  const db = ensureDb();
  db.resources = db.resources.filter((r) => r.id !== resourceId);
  persist(db);
}

export function addTopicNote(input: {
  topicId: string;
  title: string;
  content: string;
  sourceUrl?: string;
}) {
  const db = ensureDb();
  const note = {
    id: makeId("note", input.title),
    topicId: input.topicId,
    title: input.title.trim(),
    content: input.content.trim(),
    sourceUrl: input.sourceUrl?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  db.notes.push(note);
  persist(db);
  return note;
}

export function deleteNote(noteId: string) {
  const db = ensureDb();
  db.notes = db.notes.filter((n) => n.id !== noteId);
  persist(db);
}

export function addTextbook(input: {
  subjectId?: string;
  title: string;
  fileName?: string;
  url?: string;
  driveFileId?: string;
  status?: "approved" | "pending";
}) {
  const db = ensureDb();
  const textbook: Textbook = {
    id: makeId("tb", input.title),
    subjectId: input.subjectId,
    title: input.title.trim(),
    fileName: input.fileName?.trim(),
    url: input.url,
    driveFileId: input.driveFileId,
    status: input.status ?? "approved",
    createdAt: new Date().toISOString(),
  };
  db.textbooks.push(textbook);
  persist(db);
  return textbook;
}

export function approveTextbookRequest(textbookId: string) {
  const db = ensureDb();
  const textbook = db.textbooks.find((t) => t.id === textbookId);
  if (!textbook) return null;
  textbook.status = "approved";
  persist(db);
  return textbook;
}

export function rejectTextbookRequest(textbookId: string) {
  deleteTextbook(textbookId);
}

export function deleteTextbook(textbookId: string) {
  const db = ensureDb();
  db.textbooks = db.textbooks.filter((t) => t.id !== textbookId);
  persist(db);
}

