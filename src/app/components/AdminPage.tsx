import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  addModule,
  addTextbook,
  addTopicNote,
  addTopicOnlineResource,
  addTopicVideo,
  addSubject,
  addTopic,
  deleteNote,
  deleteModule,
  deleteResource,
  deleteSubject,
  deleteTextbook,
  deleteTopic,
  getAdminEmail,
  importModulesWithTopics,
  CYCLE_SEMESTER_ID,
  departmentUsesSemesters,
  getDepartments,
  getModules,
  getSemesters,
  getSubjects,
  getTextbooks,
  getTopicNotes,
  getTopicOnlineResources,
  getTopics,
  getTopicVideos,
  isAdminLoggedIn,
  logoutAdmin,
  setAdminSession,
  updateModule,
  updateSubject,
  updateTopic,
  verifyAdminCredentials,
} from "@/app/data/localDb";
import { extractSyllabusFromImage, type SyllabusOutline } from "@/app/services/syllabusVisionExtract";
import { initializeTokenClient, uploadFileToDrive, getOrCreateTextbooksFolder, isSignedIn, signIn, signOut, listTextbooksFromDrive } from "@/app/services/googleDrive";

export function AdminPage() {
  const navigate = useNavigate();
  const [loggedIn, setLoggedIn] = useState(isAdminLoggedIn());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const departments = getDepartments();
  const semesters = getSemesters();
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(departments[0]?.id ?? "");
  const [selectedSemesterId, setSelectedSemesterId] = useState(semesters[0]?.id ?? "");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState("");

  const [subjectForm, setSubjectForm] = useState({
    name: "",
    code: "",
  });
  const [moduleForm, setModuleForm] = useState({ name: "" });
  const [topicForm, setTopicForm] = useState({ name: "" });
  const [textbookForm, setTextbookForm] = useState({ title: "" });
  const [textbookFile, setTextbookFile] = useState<File | null>(null);
  const [globalTextbookForm, setGlobalTextbookForm] = useState({ title: "" });
  const [globalTextbookFile, setGlobalTextbookFile] = useState<File | null>(null);
  const [googleSignedIn, setGoogleSignedIn] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [availableTextbooks, setAvailableTextbooks] = useState<Array<{ id: string; name: string; webViewLink: string }>>([]);
  const [loadingTextbooks, setLoadingTextbooks] = useState(false);
  const [showImportList, setShowImportList] = useState(false);
  const [noteForm, setNoteForm] = useState({ title: "", content: "", sourceUrl: "" });
  const [onlineResourceForm, setOnlineResourceForm] = useState({
    title: "",
    description: "",
    url: "",
    type: "Article" as "Article" | "GitHub",
  });
  const [videoForm, setVideoForm] = useState({ title: "", description: "", url: "" });
  const [syllabusFile, setSyllabusFile] = useState<File | null>(null);
  const [syllabusPasteDataUrl, setSyllabusPasteDataUrl] = useState<string | null>(null);
  const syllabusFileInputRef = useRef<HTMLInputElement>(null);
  const [syllabusExtracting, setSyllabusExtracting] = useState(false);
  const [syllabusPreview, setSyllabusPreview] = useState<SyllabusOutline | null>(null);
  const [syllabusError, setSyllabusError] = useState("");

  const subjects = useMemo(() => {
    if (!selectedDepartmentId) return [];
    if (departmentUsesSemesters(selectedDepartmentId)) {
      if (!selectedSemesterId) return [];
      return getSubjects(selectedDepartmentId, selectedSemesterId);
    }
    return getSubjects(selectedDepartmentId, CYCLE_SEMESTER_ID);
  }, [refreshKey, selectedDepartmentId, selectedSemesterId]);
  const modules = useMemo(
    () => (selectedSubjectId ? getModules(selectedSubjectId) : []),
    [refreshKey, selectedSubjectId],
  );
  const topics = useMemo(
    () => (selectedModuleId ? getTopics(selectedModuleId) : []),
    [refreshKey, selectedModuleId],
  );
  const textbooks = useMemo(
    () => (selectedSubjectId ? getTextbooks(selectedSubjectId) : []),
    [refreshKey, selectedSubjectId],
  );
  const topicNotes = useMemo(
    () => (selectedTopicId ? getTopicNotes(selectedTopicId) : []),
    [refreshKey, selectedTopicId],
  );
  const topicOnlineResources = useMemo(
    () => (selectedTopicId ? getTopicOnlineResources(selectedTopicId) : []),
    [refreshKey, selectedTopicId],
  );
  const topicVideos = useMemo(
    () => (selectedTopicId ? getTopicVideos(selectedTopicId) : []),
    [refreshKey, selectedTopicId],
  );

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  useEffect(() => {
    if (!subjects.some((s) => s.id === selectedSubjectId)) {
      setSelectedSubjectId("");
      setSelectedModuleId("");
      setSelectedTopicId("");
    }
  }, [subjects, selectedSubjectId]);

  useEffect(() => {
    if (!modules.some((m) => m.id === selectedModuleId)) {
      setSelectedModuleId("");
      setSelectedTopicId("");
    }
  }, [modules, selectedModuleId]);

  useEffect(() => {
    if (!topics.some((t) => t.id === selectedTopicId)) {
      setSelectedTopicId("");
    }
  }, [topics, selectedTopicId]);

  useEffect(() => {
    // Initialize Google OAuth
    initializeTokenClient().catch((error) => {
      console.error('Failed to initialize Google OAuth:', error);
    });
    setGoogleSignedIn(isSignedIn());
  }, []);

  const loadAvailableTextbooks = async () => {
    try {
      setLoadingTextbooks(true);
      const files = await listTextbooksFromDrive();
      setAvailableTextbooks(files);
      setShowImportList(true);
    } catch (error) {
      console.error('Failed to load textbooks from Google Drive:', error);
      alert('Failed to load textbooks from Google Drive');
    } finally {
      setLoadingTextbooks(false);
    }
  };

  const importTextbookFromDrive = (file: { id: string; name: string; webViewLink: string }) => {
    addTextbook({
      subjectId: selectedSubjectId || undefined,
      title: file.name,
      url: file.webViewLink,
      fileName: file.name,
      driveFileId: file.id,
    });
    
    refresh();
    alert(`Textbook "${file.name}" imported successfully!`);
    setShowImportList(false);
  };

  function handleSyllabusPaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items?.length) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = () => {
          setSyllabusPasteDataUrl(String(reader.result ?? ""));
          setSyllabusFile(null);
          if (syllabusFileInputRef.current) syllabusFileInputRef.current.value = "";
          setSyllabusPreview(null);
          setSyllabusError("");
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  }

  function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (!verifyAdminCredentials(email, password)) {
      setLoginError("Invalid credentials");
      return;
    }
    setAdminSession(true);
    setLoggedIn(true);
    setLoginError("");
  }

  function handleLogout() {
    logoutAdmin();
    setLoggedIn(false);
  }

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <form onSubmit={handleLogin} className="w-full max-w-md bg-white p-6 rounded-xl shadow border">
          <h1 className="text-2xl font-semibold mb-1">Admin Login</h1>
          <p className="text-sm text-slate-600 mb-4">Authorized admin email: {getAdminEmail() || "(set in .env)"}</p>

          <label htmlFor="admin-email" className="block text-sm mb-1">
            Email
          </label>
          <input
            id="admin-email"
            className="w-full border rounded-md px-3 py-2 mb-3"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label htmlFor="admin-password" className="block text-sm mb-1">
            Password
          </label>
          <input
            id="admin-password"
            className="w-full border rounded-md px-3 py-2 mb-3"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {loginError ? <p className="text-sm text-red-600 mb-3">{loginError}</p> : null}
          <button type="submit" className="w-full bg-primary text-white rounded-md py-2">
            Sign In
          </button>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="w-full mt-2 border rounded-md py-2"
          >
            Back to Dashboard
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Admin Database Manager</h1>
          <div className="flex gap-2">
            <button onClick={() => navigate("/dashboard")} className="px-4 py-2 border rounded-md">
              Dashboard
            </button>
            <button onClick={handleLogout} className="px-4 py-2 bg-red-600 text-white rounded-md">
              Logout
            </button>
          </div>
        </div>

        <div
          className="bg-white rounded-xl shadow border p-4 border-dashed border-primary/30 outline-none focus:ring-2 focus:ring-primary/30"
          tabIndex={0}
          onPaste={handleSyllabusPaste}
        >
          <h2 className="text-xl font-medium mb-1">Extract modules &amp; topics from syllabus image</h2>
          <p className="text-sm text-slate-600 mb-3">
            First use <strong>Selection Flow</strong> below to pick department, semester (if applicable), and subject.
            Then upload an image <strong>or</strong> click this box and press <kbd className="px-1 bg-slate-100 rounded text-xs">Ctrl</kbd>+
            <kbd className="px-1 bg-slate-100 rounded text-xs">V</kbd> to paste a screenshot. OpenAI reads the image; review
            the preview, then import. Physics/Chemistry Cycle subjects do not use a semester—pick department and subject only.
          </p>
          <div className="flex flex-wrap gap-3 items-end">
            <input
              ref={syllabusFileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="border rounded-md px-3 py-2 text-sm"
              aria-label="Upload syllabus image file"
              onChange={(e) => {
                setSyllabusFile(e.target.files?.[0] ?? null);
                setSyllabusPasteDataUrl(null);
                setSyllabusPreview(null);
                setSyllabusError("");
              }}
            />
            <button
              type="button"
              className="px-4 py-2 bg-slate-800 text-white rounded-md disabled:opacity-50"
              disabled={
                !selectedSubjectId || syllabusExtracting || (!syllabusFile && !syllabusPasteDataUrl)
              }
              onClick={async () => {
                if (!selectedSubjectId) return;
                const dataUrl = syllabusPasteDataUrl ?? (syllabusFile ? await fileToDataUrl(syllabusFile) : null);
                if (!dataUrl) return;
                setSyllabusExtracting(true);
                setSyllabusError("");
                setSyllabusPreview(null);
                try {
                  const outline = await extractSyllabusFromImage(dataUrl);
                  setSyllabusPreview(outline);
                } catch (err: unknown) {
                  setSyllabusError(err instanceof Error ? err.message : "Extraction failed");
                } finally {
                  setSyllabusExtracting(false);
                }
              }}
            >
              {syllabusExtracting ? "Extracting…" : "Extract from image"}
            </button>
          </div>
          {syllabusPasteDataUrl ? (
            <p className="text-xs text-slate-500 mt-2">Image source: clipboard paste</p>
          ) : syllabusFile ? (
            <p className="text-xs text-slate-500 mt-2">Image source: {syllabusFile.name}</p>
          ) : null}
          {syllabusPasteDataUrl ? (
            <img
              src={syllabusPasteDataUrl}
              alt="Pasted syllabus preview"
              className="mt-3 max-h-40 rounded border border-slate-200 object-contain"
            />
          ) : null}
          {syllabusError ? <p className="text-sm text-red-600 mt-2">{syllabusError}</p> : null}
          {syllabusPreview ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium text-slate-700">
                Review &amp; edit ({syllabusPreview.modules.length} modules) — fix any mistakes before import
              </p>
              <div className="max-h-[28rem] overflow-auto border rounded-md p-3 bg-slate-50 text-sm space-y-4">
                {syllabusPreview.modules.map((mod, mi) => (
                  <div key={mi} className="border border-slate-200 rounded-md p-3 bg-white space-y-2">
                    <div className="flex flex-wrap gap-2 items-center">
                      <label htmlFor={`syllabus-module-name-${mi}`} className="text-xs text-slate-500 w-full sm:w-auto">
                        Module name
                      </label>
                      <input
                        id={`syllabus-module-name-${mi}`}
                        className="flex-1 min-w-[200px] border rounded-md px-2 py-1.5 text-sm font-semibold text-primary"
                        value={mod.name}
                        onChange={(e) => {
                          const next = syllabusPreview.modules.map((m, i) =>
                            i === mi ? { ...m, name: e.target.value } : m,
                          );
                          setSyllabusPreview({ modules: next });
                        }}
                      />
                      <button
                        type="button"
                        className="text-sm text-red-600 hover:underline"
                        onClick={() => {
                          setSyllabusPreview({
                            modules: syllabusPreview.modules.filter((_, i) => i !== mi),
                          });
                        }}
                      >
                        Remove module
                      </button>
                    </div>
                    <div className="space-y-1.5 pl-0 sm:pl-2">
                      <span className="text-xs text-slate-500">Topics</span>
                      {mod.topics.map((t, ti) => (
                        <div key={ti} className="flex gap-2 items-center">
                          <input
                            className="flex-1 border rounded-md px-2 py-1 text-sm text-slate-700"
                            value={t}
                            placeholder="Topic"
                            aria-label="Syllabus topic name"
                            onChange={(e) => {
                              const next = syllabusPreview.modules.map((m, i) => {
                                if (i !== mi) return m;
                                const topics = m.topics.map((topic, j) => (j === ti ? e.target.value : topic));
                                return { ...m, topics };
                              });
                              setSyllabusPreview({ modules: next });
                            }}
                          />
                          <button
                            type="button"
                            className="shrink-0 px-2 py-1 text-slate-500 hover:text-red-600"
                            aria-label="Remove topic"
                            onClick={() => {
                              const next = syllabusPreview.modules.map((m, i) => {
                                if (i !== mi) return m;
                                return { ...m, topics: m.topics.filter((_, j) => j !== ti) };
                              });
                              setSyllabusPreview({ modules: next });
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="text-xs text-primary font-medium hover:underline"
                        onClick={() => {
                          const next = syllabusPreview.modules.map((m, i) =>
                            i === mi ? { ...m, topics: [...m.topics, ""] } : m,
                          );
                          setSyllabusPreview({ modules: next });
                        }}
                      >
                        + Add topic
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className="w-full sm:w-auto px-3 py-2 border border-dashed border-primary/40 rounded-md text-sm text-primary hover:bg-primary/5"
                  onClick={() =>
                    setSyllabusPreview({
                      modules: [...syllabusPreview.modules, { name: "", topics: [""] }],
                    })
                  }
                >
                  + Add module
                </button>
              </div>
              <button
                type="button"
                className="px-4 py-2 bg-primary text-white rounded-md"
                onClick={() => {
                  if (!selectedSubjectId || !syllabusPreview) return;
                  const cleaned = syllabusPreview.modules
                    .map((m) => ({
                      name: m.name.trim(),
                      topics: m.topics.map((t) => t.trim()).filter(Boolean),
                    }))
                    .filter((m) => m.name);
                  if (cleaned.length === 0) {
                    setSyllabusError("Add at least one module with a name.");
                    return;
                  }
                  importModulesWithTopics(selectedSubjectId, cleaned);
                  setSyllabusPreview(null);
                  setSyllabusFile(null);
                  setSyllabusPasteDataUrl(null);
                  if (syllabusFileInputRef.current) syllabusFileInputRef.current.value = "";
                  refresh();
                }}
              >
                Import into database for this subject
              </button>
            </div>
          ) : null}
        </div>

        <div className="bg-white rounded-xl shadow border p-4">
          <h2 className="text-xl font-medium mb-3">Selection Flow</h2>
          <div className="grid md:grid-cols-4 gap-3">
            <select
              aria-label="Select department"
              className="border rounded-md px-3 py-2"
              value={selectedDepartmentId}
              onChange={(e) => {
                setSelectedDepartmentId(e.target.value);
                setSelectedSubjectId("");
                setSelectedModuleId("");
                setSelectedTopicId("");
              }}
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            {departmentUsesSemesters(selectedDepartmentId) ? (
              <select
                aria-label="Select semester"
                className="border rounded-md px-3 py-2"
                value={selectedSemesterId}
                onChange={(e) => {
                  setSelectedSemesterId(e.target.value);
                  setSelectedSubjectId("");
                  setSelectedModuleId("");
                  setSelectedTopicId("");
                }}
              >
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <select
                aria-label="Semester not applicable"
                className="border rounded-md px-3 py-2 bg-slate-100 text-slate-600 cursor-not-allowed"
                disabled
              >
                <option>Not applicable (Cycle)</option>
              </select>
            )}
            <select
              aria-label="Select subject"
              className="border rounded-md px-3 py-2"
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                setSelectedModuleId("");
                setSelectedTopicId("");
              }}
              disabled={
                !selectedDepartmentId ||
                (departmentUsesSemesters(selectedDepartmentId) && !selectedSemesterId)
              }
            >
              <option value="">{subjects.length ? "Select subject" : "No subjects"}</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code ? `${s.name} (${s.code})` : s.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Select module"
              className="border rounded-md px-3 py-2"
              value={selectedModuleId}
              onChange={(e) => setSelectedModuleId(e.target.value)}
              disabled={!selectedSubjectId || modules.length === 0}
            >
              <option value="">{modules.length ? "Select module" : "No modules"}</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Select topic"
              className="border rounded-md px-3 py-2"
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              disabled={!selectedModuleId || topics.length === 0}
            >
              <option value="">{topics.length ? "Select topic" : "No topics"}</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow border p-4">
          <h2 className="text-xl font-medium mb-3">Add Subject</h2>
          <p className="text-sm text-slate-600 mb-3">
            Adding into:{" "}
            {departments.find((d) => d.id === selectedDepartmentId)?.name} /{" "}
            {departmentUsesSemesters(selectedDepartmentId)
              ? semesters.find((s) => s.id === selectedSemesterId)?.name ?? "—"
              : "Cycle (stored as semester id \"cycle\" in DB)"}
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            <input
              className="border rounded-md px-3 py-2"
              placeholder="Subject name"
              aria-label="Subject name"
              value={subjectForm.name}
              onChange={(e) => setSubjectForm((s) => ({ ...s, name: e.target.value }))}
            />
            <input
              className="border rounded-md px-3 py-2"
              placeholder="Code (optional)"
              aria-label="Subject code"
              value={subjectForm.code}
              onChange={(e) => setSubjectForm((s) => ({ ...s, code: e.target.value }))}
            />
          </div>
          <button
            className="mt-3 px-4 py-2 bg-primary text-white rounded-md"
            onClick={() => {
              if (!selectedDepartmentId || !subjectForm.name.trim()) return;
              if (departmentUsesSemesters(selectedDepartmentId) && !selectedSemesterId) return;
              const semesterId = departmentUsesSemesters(selectedDepartmentId)
                ? selectedSemesterId
                : CYCLE_SEMESTER_ID;
              addSubject({
                departmentId: selectedDepartmentId,
                semesterId,
                name: subjectForm.name,
                code: subjectForm.code,
              });
              setSubjectForm({ name: "", code: "" });
              refresh();
            }}
          >
            Add Subject
          </button>
        </div>

        <div className="bg-white rounded-xl shadow border p-4">
          <h2 className="text-xl font-medium mb-3">Add Module</h2>
          <p className="text-sm text-slate-600 mb-3">
            Adding into selected subject:{" "}
            {subjects.find((s) => s.id === selectedSubjectId)?.name ?? "None selected"}
          </p>
          <div className="grid md:grid-cols-1 gap-3">
            <input
              className="border rounded-md px-3 py-2"
              placeholder="Module name"
              aria-label="Module name"
              value={moduleForm.name}
              onChange={(e) => setModuleForm((m) => ({ ...m, name: e.target.value }))}
            />
          </div>
          <button
            className="mt-3 px-4 py-2 bg-primary text-white rounded-md"
            disabled={!selectedSubjectId}
            onClick={() => {
              if (!selectedSubjectId || !moduleForm.name.trim()) return;
              addModule({ subjectId: selectedSubjectId, name: moduleForm.name });
              setModuleForm({ name: "" });
              refresh();
            }}
          >
            Add Module
          </button>
        </div>

        <div className="bg-white rounded-xl shadow border p-4">
          <h2 className="text-xl font-medium mb-3">Add Topic</h2>
          <p className="text-sm text-slate-600 mb-3">
            Adding into selected module:{" "}
            {modules.find((m) => m.id === selectedModuleId)?.name ?? "None selected"}
          </p>
          <div className="grid md:grid-cols-1 gap-3">
            <input
              className="border rounded-md px-3 py-2"
              placeholder="Topic name"
              aria-label="Topic name"
              value={topicForm.name}
              onChange={(e) => setTopicForm((t) => ({ ...t, name: e.target.value }))}
            />
          </div>
          <button
            className="mt-3 px-4 py-2 bg-primary text-white rounded-md"
            disabled={!selectedModuleId}
            onClick={() => {
              if (!selectedModuleId || !topicForm.name.trim()) return;
              addTopic({ moduleId: selectedModuleId, name: topicForm.name });
              setTopicForm({ name: "" });
              refresh();
            }}
          >
            Add Topic
          </button>
        </div>

        <ManagerSection
          title="Subjects"
          rows={subjects.map((s) => ({
            id: s.id,
            label: s.name,
            onEdit: (name) => updateSubject(s.id, { name }),
            onDelete: () => deleteSubject(s.id),
          }))}
          onChanged={refresh}
        />
        <ManagerSection
          title="Modules"
          rows={modules.map((m) => ({
            id: m.id,
            label: m.name,
            onEdit: (name) => updateModule(m.id, { name }),
            onDelete: () => deleteModule(m.id),
          }))}
          onChanged={refresh}
        />
        <ManagerSection
          title="Topics"
          rows={topics.map((t) => ({
            id: t.id,
            label: t.name,
            onEdit: (name) => updateTopic(t.id, { name }),
            onDelete: () => deleteTopic(t.id),
          }))}
          onChanged={refresh}
        />

        <div className="bg-white rounded-xl shadow border p-4">
          <h2 className="text-xl font-medium mb-3">Upload Textbooks to Google Drive</h2>
          <p className="text-sm text-slate-600 mb-3">
            Linked subject: {subjects.find((s) => s.id === selectedSubjectId)?.name ?? "None selected"}
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            <input
              className="border rounded-md px-3 py-2"
              placeholder="Textbook title"
              aria-label="Textbook title"
              value={textbookForm.title}
              onChange={(e) => setTextbookForm((v) => ({ ...v, title: e.target.value }))}
            />
            <input
              className="border rounded-md px-3 py-2"
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx"
              aria-label="Textbook file upload"
              onChange={(e) => setTextbookFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="mt-3 flex items-center gap-2">
            {googleSignedIn ? (
              <span className="text-green-600 text-sm">✓ Signed in to Google</span>
            ) : (
              <button
                className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                onClick={async () => {
                  try {
                    await signIn();
                    setGoogleSignedIn(true);
                  } catch (error) {
                    console.error('Google sign-in failed:', error);
                    alert('Failed to sign in to Google. Please check your credentials in .env');
                  }
                }}
              >
                Sign in to Google
              </button>
            )}
          </div>
          <button
            className="mt-3 px-4 py-2 bg-primary text-white rounded-md disabled:opacity-50 hover:bg-primary/90"
            disabled={!selectedSubjectId || !textbookForm.title.trim() || !textbookFile || uploading || !googleSignedIn}
            onClick={async () => {
              if (!selectedSubjectId || !textbookForm.title.trim() || !textbookFile) return;
              setUploading(true);
              try {
                const folderId = await getOrCreateTextbooksFolder();
                const result = await uploadFileToDrive(textbookFile, folderId);
                
                addTextbook({
                  subjectId: selectedSubjectId,
                  title: textbookForm.title,
                  url: result.webViewLink,
                  fileName: textbookFile.name,
                  driveFileId: result.id,
                });
                setTextbookForm({ title: "" });
                setTextbookFile(null);
                alert('Textbook uploaded successfully!');
                refresh();
              } catch (error) {
                console.error('Upload failed:', error);
                alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
              } finally {
                setUploading(false);
              }
            }}
          >
            {uploading ? 'Uploading...' : 'Upload Textbook to Google Drive'}
          </button>
          <button
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md disabled:opacity-50 hover:bg-blue-600"
            disabled={!selectedSubjectId || !googleSignedIn || loadingTextbooks}
            onClick={loadAvailableTextbooks}
          >
            {loadingTextbooks ? 'Loading...' : 'Import from Google Drive'}
          </button>
          
          {showImportList && (
            <div className="mt-4 p-4 border rounded-lg bg-blue-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">Available Textbooks in Google Drive</h3>
                <button
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setShowImportList(false)}
                >
                  ✕
                </button>
              </div>
              {availableTextbooks.length === 0 ? (
                <p className="text-gray-600">No textbooks found in Google Drive Textbooks folder</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableTextbooks.map((file) => (
                    <div key={file.id} className="flex items-center justify-between bg-white p-3 rounded-md border">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{file.name}</p>
                        <a href={file.webViewLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs hover:underline">
                          View in Drive
                        </a>
                      </div>
                      <button
                        className="ml-3 px-3 py-1.5 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
                        onClick={() => importTextbookFromDrive(file)}
                      >
                        Import
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="mt-4 space-y-2">
            {textbooks.map((tb) => (
              <div key={tb.id} className="grid md:grid-cols-[1fr_auto] gap-2 items-center border rounded-md p-2">
                <a href={tb.url} target="_blank" rel="noopener noreferrer" className="text-primary">
                  {tb.title} {tb.fileName ? `(${tb.fileName})` : ""}
                </a>
                <button
                  className="px-3 py-1.5 bg-red-600 text-white rounded-md"
                  onClick={() => {
                    deleteTextbook(tb.id);
                    refresh();
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
            {selectedSubjectId && textbooks.length === 0 ? (
              <p className="text-sm text-slate-500">No textbooks added for this subject.</p>
            ) : null}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow border p-4">
          <h2 className="text-xl font-medium mb-3">Global Textbooks (Available to Everyone)</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <input
              className="border rounded-md px-3 py-2"
              placeholder="Textbook title"
              aria-label="Global textbook title"
              value={globalTextbookForm.title}
              onChange={(e) => setGlobalTextbookForm((v) => ({ ...v, title: e.target.value }))}
            />
            <input
              className="border rounded-md px-3 py-2"
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx"
              aria-label="Global textbook file upload"
              onChange={(e) => setGlobalTextbookFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="mt-3 flex items-center gap-2">
            {googleSignedIn ? (
              <span className="text-green-600 text-sm">✓ Signed in to Google</span>
            ) : (
              <button
                className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                onClick={async () => {
                  try {
                    await signIn();
                    setGoogleSignedIn(true);
                  } catch (error) {
                    console.error('Google sign-in failed:', error);
                    alert('Failed to sign in to Google. Please check your credentials in .env');
                  }
                }}
              >
                Sign in to Google
              </button>
            )}
          </div>
          <button
            className="mt-3 px-4 py-2 bg-primary text-white rounded-md disabled:opacity-50 hover:bg-primary/90"
            disabled={!globalTextbookForm.title.trim() || !globalTextbookFile || uploading || !googleSignedIn}
            onClick={async () => {
              if (!globalTextbookForm.title.trim() || !globalTextbookFile) return;
              setUploading(true);
              try {
                const folderId = await getOrCreateTextbooksFolder();
                const result = await uploadFileToDrive(globalTextbookFile, folderId);
                
                addTextbook({
                  title: globalTextbookForm.title,
                  url: result.webViewLink,
                  fileName: globalTextbookFile.name,
                  driveFileId: result.id,
                });
                setGlobalTextbookForm({ title: "" });
                setGlobalTextbookFile(null);
                alert('Global textbook uploaded successfully!');
                refresh();
              } catch (error) {
                console.error('Upload failed:', error);
                alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
              } finally {
                setUploading(false);
              }
            }}
          >
            {uploading ? 'Uploading...' : 'Upload Global Textbook to Google Drive'}
          </button>
          <div className="mt-4 space-y-2">
            {textbooks.filter(tb => !tb.subjectId).map((tb) => (
              <div key={tb.id} className="grid md:grid-cols-[1fr_auto] gap-2 items-center border rounded-md p-2">
                <a href={tb.url} target="_blank" rel="noopener noreferrer" className="text-primary">
                  {tb.title} {tb.fileName ? `(${tb.fileName})` : ""}
                </a>
                <button
                  className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                  onClick={() => {
                    deleteTextbook(tb.id);
                    refresh();
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
            {textbooks.filter(tb => !tb.subjectId).length === 0 ? (
              <p className="text-sm text-slate-500">No global textbooks added.</p>
            ) : null}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow border p-4">
          <h2 className="text-xl font-medium mb-3">Topic Folders (Admin)</h2>
          <p className="text-sm text-slate-600 mb-3">
            Linked topic: {topics.find((t) => t.id === selectedTopicId)?.name ?? "None selected"}
          </p>
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="border rounded-lg p-3">
              <h3 className="font-semibold mb-2">Notes</h3>
              <input className="border rounded-md px-3 py-2 w-full mb-2" placeholder="Title" aria-label="Note title" value={noteForm.title} onChange={(e) => setNoteForm((v) => ({ ...v, title: e.target.value }))} />
              <textarea className="border rounded-md px-3 py-2 w-full mb-2" placeholder="Content" aria-label="Note content" value={noteForm.content} onChange={(e) => setNoteForm((v) => ({ ...v, content: e.target.value }))} />
              <input className="border rounded-md px-3 py-2 w-full mb-2" placeholder="Source URL (optional)" aria-label="Note source URL" value={noteForm.sourceUrl} onChange={(e) => setNoteForm((v) => ({ ...v, sourceUrl: e.target.value }))} />
              <button
                className="px-3 py-2 bg-primary text-white rounded-md w-full"
                disabled={!selectedTopicId}
                onClick={() => {
                  if (!selectedTopicId || !noteForm.title.trim() || !noteForm.content.trim()) return;
                  addTopicNote({ topicId: selectedTopicId, ...noteForm });
                  setNoteForm({ title: "", content: "", sourceUrl: "" });
                  refresh();
                }}
              >
                Add Note
              </button>
              <div className="mt-3 space-y-1">
                {topicNotes.map((n) => (
                  <div key={n.id} className="flex items-center justify-between gap-2 text-sm border rounded-md p-2">
                    <span className="truncate">{n.title}</span>
                    <button className="text-red-600" onClick={() => { deleteNote(n.id); refresh(); }}>Delete</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="border rounded-lg p-3">
              <h3 className="font-semibold mb-2">Online Resources</h3>
              <input className="border rounded-md px-3 py-2 w-full mb-2" placeholder="Title" aria-label="Online resource title" value={onlineResourceForm.title} onChange={(e) => setOnlineResourceForm((v) => ({ ...v, title: e.target.value }))} />
              <input className="border rounded-md px-3 py-2 w-full mb-2" placeholder="Description" aria-label="Online resource description" value={onlineResourceForm.description} onChange={(e) => setOnlineResourceForm((v) => ({ ...v, description: e.target.value }))} />
              <input className="border rounded-md px-3 py-2 w-full mb-2" placeholder="URL" aria-label="Online resource URL" value={onlineResourceForm.url} onChange={(e) => setOnlineResourceForm((v) => ({ ...v, url: e.target.value }))} />
              <select aria-label="Online resource type" className="border rounded-md px-3 py-2 w-full mb-2" value={onlineResourceForm.type} onChange={(e) => setOnlineResourceForm((v) => ({ ...v, type: e.target.value as "Article" | "GitHub" }))}>
                <option value="Article">Article</option>
                <option value="GitHub">GitHub</option>
              </select>
              <button
                className="px-3 py-2 bg-primary text-white rounded-md w-full"
                disabled={!selectedTopicId}
                onClick={() => {
                  if (!selectedTopicId || !onlineResourceForm.title.trim() || !onlineResourceForm.url.trim()) return;
                  addTopicOnlineResource({ topicId: selectedTopicId, ...onlineResourceForm });
                  setOnlineResourceForm({ title: "", description: "", url: "", type: "Article" });
                  refresh();
                }}
              >
                Add Resource
              </button>
              <div className="mt-3 space-y-1">
                {topicOnlineResources.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-2 text-sm border rounded-md p-2">
                    <span className="truncate">{r.title}</span>
                    <button className="text-red-600" onClick={() => { deleteResource(r.id); refresh(); }}>Delete</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="border rounded-lg p-3">
              <h3 className="font-semibold mb-2">Videos</h3>
              <input className="border rounded-md px-3 py-2 w-full mb-2" placeholder="Title" aria-label="Video title" value={videoForm.title} onChange={(e) => setVideoForm((v) => ({ ...v, title: e.target.value }))} />
              <input className="border rounded-md px-3 py-2 w-full mb-2" placeholder="Description" aria-label="Video description" value={videoForm.description} onChange={(e) => setVideoForm((v) => ({ ...v, description: e.target.value }))} />
              <input className="border rounded-md px-3 py-2 w-full mb-2" placeholder="Video URL" aria-label="Video URL" value={videoForm.url} onChange={(e) => setVideoForm((v) => ({ ...v, url: e.target.value }))} />
              <button
                className="px-3 py-2 bg-primary text-white rounded-md w-full"
                disabled={!selectedTopicId}
                onClick={() => {
                  if (!selectedTopicId || !videoForm.title.trim() || !videoForm.url.trim()) return;
                  addTopicVideo({ topicId: selectedTopicId, ...videoForm });
                  setVideoForm({ title: "", description: "", url: "" });
                  refresh();
                }}
              >
                Add Video
              </button>
              <div className="mt-3 space-y-1">
                {topicVideos.map((v) => (
                  <div key={v.id} className="flex items-center justify-between gap-2 text-sm border rounded-md p-2">
                    <span className="truncate">{v.title}</span>
                    <button className="text-red-600" onClick={() => { deleteResource(v.id); refresh(); }}>Delete</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ManagerSection({
  title,
  rows,
  onChanged,
}: {
  title: string;
  rows: Array<{ id: string; label: string; onEdit: (name: string) => unknown; onDelete: () => unknown }>;
  onChanged: () => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  return (
    <div className="bg-white rounded-xl shadow border p-4">
      <h2 className="text-xl font-medium mb-3">Manage {title}</h2>
      <div className="space-y-2 max-h-80 overflow-auto pr-1">
        {rows.map((row) => (
          <div key={row.id} className="grid md:grid-cols-[1fr_auto_auto] gap-2 items-center">
            <input
              className="border rounded-md px-3 py-2"
              aria-label={`Edit ${row.label}`}
              value={drafts[row.id] ?? row.label}
              onChange={(e) => setDrafts((d) => ({ ...d, [row.id]: e.target.value }))}
            />
            <button
              className="px-3 py-2 border rounded-md"
              onClick={() => {
                const newValue = (drafts[row.id] ?? row.label).trim();
                if (!newValue) return;
                row.onEdit(newValue);
                onChanged();
              }}
            >
              Save
            </button>
            <button
              className="px-3 py-2 bg-red-600 text-white rounded-md"
              onClick={() => {
                row.onDelete();
                onChanged();
              }}
            >
              Delete
            </button>
          </div>
        ))}
        {rows.length === 0 ? <p className="text-sm text-slate-500">No items yet.</p> : null}
      </div>
    </div>
  );
}

