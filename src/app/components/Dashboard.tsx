import { useState, useEffect, type ReactNode } from "react";
import { motion } from "motion/react";
import {
  ChevronDown,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router";

import logo from "@/assets/pesitmlogo.png";
import {
  getDepartments as dbGetDepartments,
  getSemesters as dbGetSemesters,
  getSubjects as dbGetSubjects,
  getModules as dbGetModules,
  getTopics as dbGetTopics,
  getTextbooks as dbGetTextbooks,
  getTopicNotes as dbGetTopicNotes,
  getTopicOnlineResources as dbGetTopicOnlineResources,
  getTopicVideos as dbGetTopicVideos,
  departmentUsesSemesters,
  CYCLE_SEMESTER_ID,
  addTextbook,
} from "@/app/data/localDb";
import { askTopicAssistant } from "@/app/services/aiAssistant";
import { getOrCreateTextbooksFolder, signIn, uploadFileToDrive } from "@/app/services/googleDrive";

// ==================== DATA SERVICE ====================
// This service layer makes it easy to swap out mock data with real database calls
// Just replace these functions with API calls to your Google Sheets or database

class DataService {
  // Simulated async call - replace with actual API call
  private static delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // DATABASE 1: Get all departments
  static async getDepartments() {
    await this.delay(300);
    return dbGetDepartments();
  }

  // DATABASE 1: Get semesters (usually static, but can be from DB)
  static async getSemesters() {
    await this.delay(200);
    return dbGetSemesters();
  }

  // DATABASE 1: Get subjects based on department and semester
  static async getSubjects(departmentId: string, semesterId: string) {
    await this.delay(400);
    return dbGetSubjects(departmentId, semesterId);
  }

  // DATABASE 2: Get modules based on subject
  static async getModules(subjectId: string) {
    await this.delay(400);
    return dbGetModules(subjectId);
  }

  // DATABASE 3: Get topics based on module
  static async getTopics(moduleId: string) {
    await this.delay(400);
    return dbGetTopics(moduleId);
  }

  static async getTextbooks(subjectId: string) {
    await this.delay(500);
    return dbGetTextbooks(subjectId);
  }

  static async getNotes(topicId: string) {
    await this.delay(500);
    return dbGetTopicNotes(topicId);
  }

  static async getOnlineResources(topicId: string) {
    await this.delay(500);
    return dbGetTopicOnlineResources(topicId);
  }

  static async getVideos(topicId: string) {
    await this.delay(500);
    return dbGetTopicVideos(topicId);
  }
}

// ==================== TYPES ====================
interface DropdownOption {
  id: string;
  name: string;
  code?: string;
}

interface ResourceLink {
  id: number;
  title: string;
  type: "Article" | "GitHub";
  description: string;
  url: string;
}

interface VideoResource {
  id: number;
  title: string;
  type: "Video";
  description: string;
  url: string;
}

interface TopicNote {
  id: string;
  topicId: string;
  title: string;
  content: string;
  sourceUrl?: string;
}

interface Textbook {
  id: string;
  title: string;
  fileName?: string;
  url?: string;
  dataUrl?: string;
}

export function Dashboard() {
  const navigate = useNavigate();

  // Selection state
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");

  // Data state
  const [departments, setDepartments] = useState<DropdownOption[]>([]);
  const [semesters, setSemesters] = useState<DropdownOption[]>([]);
  const [subjects, setSubjects] = useState<DropdownOption[]>([]);
  const [modules, setModules] = useState<DropdownOption[]>([]);
  const [topics, setTopics] = useState<DropdownOption[]>([]);
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [requestForm, setRequestForm] = useState({ title: "" });
  const [requestFile, setRequestFile] = useState<File | null>(null);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [notes, setNotes] = useState<TopicNote[]>([]);
  const [onlineResources, setOnlineResources] = useState<ResourceLink[]>([]);
  const [videos, setVideos] = useState<VideoResource[]>([]);

  // Loading state
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [isLoadingModules, setIsLoadingModules] = useState(false);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [isLoadingTopicData, setIsLoadingTopicData] = useState(false);
  const [isLoadingTextbooks, setIsLoadingTextbooks] = useState(false);
  const [askMode, setAskMode] = useState<"explain" | "research">("explain");
  const [askPrompt, setAskPrompt] = useState("");
  const [askResponse, setAskResponse] = useState("");
  const [askMeta, setAskMeta] = useState("");
  const [isAsking, setIsAsking] = useState(false);

  // Load initial data
  useEffect(() => {
    DataService.getDepartments().then(setDepartments);
    DataService.getSemesters().then(setSemesters);
  }, []);

  // Load subjects when department is selected (semester required only for non-cycle departments)
  useEffect(() => {
    if (!selectedDepartment) {
      setSubjects([]);
      return;
    }
    if (departmentUsesSemesters(selectedDepartment)) {
      if (!selectedSemester) {
        setSubjects([]);
        return;
      }
      setIsLoadingSubjects(true);
      DataService.getSubjects(selectedDepartment, selectedSemester)
        .then(setSubjects)
        .finally(() => setIsLoadingSubjects(false));
    } else {
      setIsLoadingSubjects(true);
      DataService.getSubjects(selectedDepartment, CYCLE_SEMESTER_ID)
        .then(setSubjects)
        .finally(() => setIsLoadingSubjects(false));
    }
  }, [selectedDepartment, selectedSemester]);

  // Load modules when subject is selected
  useEffect(() => {
    if (selectedSubject) {
      setIsLoadingModules(true);
      DataService.getModules(selectedSubject)
        .then(setModules)
        .finally(() => setIsLoadingModules(false));
    } else {
      setModules([]);
    }
  }, [selectedSubject]);

  // Load topics when module is selected
  useEffect(() => {
    if (selectedModule) {
      setIsLoadingTopics(true);
      DataService.getTopics(selectedModule)
        .then(setTopics)
        .finally(() => setIsLoadingTopics(false));
    } else {
      setTopics([]);
    }
  }, [selectedModule]);

  // Load textbooks when subject is selected
  useEffect(() => {
    if (selectedSubject) {
      setIsLoadingTextbooks(true);
      DataService.getTextbooks(selectedSubject)
        .then(setTextbooks)
        .finally(() => setIsLoadingTextbooks(false));
    } else {
      setTextbooks([]);
    }
  }, [selectedSubject]);

  // Load notes/resources/videos when topic is selected
  useEffect(() => {
    if (selectedTopic) {
      setIsLoadingTopicData(true);
      Promise.all([
        DataService.getNotes(selectedTopic),
        DataService.getOnlineResources(selectedTopic),
        DataService.getVideos(selectedTopic),
      ])
        .then(([topicNotes, links, topicVideos]) => {
          setNotes(topicNotes);
          setOnlineResources(links);
          setVideos(topicVideos);
        })
        .finally(() => setIsLoadingTopicData(false));
    } else {
      setNotes([]);
      setOnlineResources([]);
      setVideos([]);
    }
  }, [selectedTopic]);

  async function handleAskBot() {
    if (!selectedTopic || !askPrompt.trim()) return;
    const topicName = topics.find((t) => t.id === selectedTopic)?.name ?? "Selected Topic";
    setIsAsking(true);
    setAskResponse("");
    setAskMeta("");
    try {
      const result = await askTopicAssistant({
        topicName,
        mode: askMode,
        userPrompt: askPrompt.trim(),
        context: {
          notes: notes.map((n) => ({ title: n.title, content: n.content })),
          resources: onlineResources.map((r) => ({ title: r.title, description: r.description, url: r.url })),
          videos: videos.map((v) => ({ title: v.title, description: v.description, url: v.url })),
          textbooks: textbooks.map((t) => ({ title: t.title, fileName: t.fileName, url: t.url })),
        },
      });
      setAskResponse(result.answer);
      setAskMeta(
        result.usedFallback
          ? "PES-PAL used Groq fallback (Gemini usage was high)."
          : `PES-PAL answered via ${result.provider === "gemini" ? "Gemini" : "Groq"}.`,
      );
    } catch (error: any) {
      setAskResponse(
        "- I could not answer right now.\n- If usage is high, please do deeper research on ChatGPT.",
      );
      setAskMeta(String(error?.message ?? "Request failed"));
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f2f8] via-white to-[#fef5f2] relative overflow-hidden">
      {/* Background accent shapes */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-destructive/5 rounded-full blur-3xl" />
      
      {/* Header */}
      <header className="px-6 py-4 border-b border-primary/10 bg-white/70 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="p-2 hover:bg-primary/10 rounded-lg transition-colors text-primary"
              aria-label="Go back to home"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <img src={logo} alt="PESITM" className="h-10 md:h-12" />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/admin")}
              className="px-3 py-1.5 text-sm border border-primary/20 text-primary rounded-md hover:bg-primary/5 transition-colors"
            >
              Admin
            </button>
            <div className="text-sm text-muted-foreground hidden md:block">
              AI Academic Resource Hub
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 md:py-12 relative">
        {/* Selection Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-primary/10 p-6 md:p-8 mb-8"
        >
          <h2 className="text-2xl md:text-3xl mb-6 text-primary">
            Select Your Course Details
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Department Dropdown */}
            <Dropdown
              label="Department"
              value={selectedDepartment}
              onChange={(value) => {
                setSelectedDepartment(value);
                setSelectedSemester("");
                setSelectedSubject("");
                setSelectedModule("");
                setSelectedTopic("");
              }}
              options={departments.map((d) => ({
                value: d.id,
                label: d.name,
              }))}
              disabled={false}
              isLoading={false}
            />

            {/* Semester: disabled for Physics / Chemistry Cycle (subjects use internal semester "cycle") */}
            {selectedDepartment && !departmentUsesSemesters(selectedDepartment) ? (
              <div className="space-y-2">
                <label className="block text-sm text-muted-foreground">Semester</label>
                <div className="relative">
                  <select
                    disabled
                    className="w-full px-4 py-3 rounded-xl border appearance-none bg-muted/50 cursor-not-allowed text-muted-foreground border-border"
                    aria-label="Semester not applicable"
                  >
                    <option>Not applicable (Cycle)</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            ) : (
              <Dropdown
                label="Semester"
                value={selectedSemester}
                onChange={(value) => {
                  setSelectedSemester(value);
                  setSelectedSubject("");
                  setSelectedModule("");
                  setSelectedTopic("");
                }}
                options={semesters.map((s) => ({
                  value: s.id,
                  label: s.name,
                }))}
                disabled={!selectedDepartment}
                isLoading={false}
              />
            )}

            {/* Subject Dropdown */}
            <Dropdown
              label="Subject"
              value={selectedSubject}
              onChange={(value) => {
                setSelectedSubject(value);
                setSelectedModule("");
                setSelectedTopic("");
              }}
              options={subjects.map((s) => ({
                value: s.id,
                label: s.code ? `${s.name} - ${s.code}` : s.name,
              }))}
              disabled={
                !selectedDepartment ||
                (departmentUsesSemesters(selectedDepartment) && !selectedSemester)
              }
              isLoading={isLoadingSubjects}
            />

            {/* Module Dropdown */}
            <Dropdown
              label="Module"
              value={selectedModule}
              onChange={(value) => {
                setSelectedModule(value);
                setSelectedTopic("");
              }}
              options={modules.map((m) => ({
                value: m.id,
                label: m.name,
              }))}
              disabled={!selectedSubject}
              isLoading={isLoadingModules}
            />

            {/* Topic Dropdown */}
            <Dropdown
              label="Topic"
              value={selectedTopic}
              onChange={setSelectedTopic}
              options={topics.map((t) => ({
                value: t.id,
                label: t.name,
              }))}
              disabled={!selectedModule}
              isLoading={isLoadingTopics}
            />
          </div>
        </motion.div>

        {/* Textbooks folder appears when subject is selected */}
        {selectedSubject && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-white/90 rounded-2xl border border-primary/10 p-6"
          >
            <h3 className="text-2xl text-primary mb-3">Textbooks Folder</h3>
            <div className="mb-4 p-4 border rounded-lg bg-blue-50">
              <h4 className="font-semibold mb-1">Request textbook addition</h4>
              <p className="text-xs text-slate-600 mb-3">
                Your upload goes to Drive as a pending request. It becomes visible to everyone only after admin approval.
              </p>
              <div className="grid md:grid-cols-2 gap-3">
                <input
                  className="border rounded-md px-3 py-2"
                  placeholder="Textbook title"
                  aria-label="Requested textbook title"
                  value={requestForm.title}
                  onChange={(e) => setRequestForm({ title: e.target.value })}
                />
                <input
                  className="border rounded-md px-3 py-2"
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                  aria-label="Requested textbook file upload"
                  onChange={(e) => setRequestFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 items-center">
                <button
                  className="px-4 py-2 bg-primary text-white rounded-md disabled:opacity-50 hover:bg-primary/90"
                  disabled={!requestForm.title.trim() || !requestFile || submittingRequest}
                  onClick={async () => {
                    if (!selectedSubject || !requestForm.title.trim() || !requestFile) return;
                    setSubmittingRequest(true);
                    try {
                      // Acquire user consent/token as part of submission flow.
                      await signIn();
                      const folderId = await getOrCreateTextbooksFolder();
                      const uploaded = await uploadFileToDrive(requestFile, folderId);
                      addTextbook({
                        subjectId: selectedSubject,
                        title: requestForm.title,
                        fileName: requestFile.name,
                        url: uploaded.webViewLink,
                        driveFileId: uploaded.id,
                        status: "pending",
                      });
                      setRequestForm({ title: "" });
                      setRequestFile(null);
                      alert("Textbook request submitted. Admin will verify and approve it.");
                    } catch (error) {
                      console.error("Textbook request upload failed:", error);
                      alert(`Failed to submit request: ${error instanceof Error ? error.message : "Unknown error"}`);
                    } finally {
                      setSubmittingRequest(false);
                    }
                  }}
                >
                  {submittingRequest ? "Submitting..." : "Submit for Admin Approval"}
                </button>
              </div>
            </div>
            {isLoadingTextbooks ? (
              <p className="text-muted-foreground">Loading textbooks...</p>
            ) : textbooks.length ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {textbooks.map((book) => (
                  <a
                    key={book.id}
                    href={book.url || book.dataUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border border-primary/10 rounded-lg p-4 hover:border-primary/30 transition-colors bg-white"
                  >
                    <div className="font-medium text-primary">{book.title}</div>
                    <div className="text-sm text-muted-foreground">{book.fileName || "Open textbook"}</div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No textbooks added for this subject yet.</p>
            )}
          </motion.section>
        )}

        {/* Topic folders */}
        {selectedTopic && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {isLoadingTopicData ? (
              <p className="text-muted-foreground">Loading topic folders...</p>
            ) : (
              <>
                <FolderSection title="Notes Folder">
                  {notes.length ? (
                    notes.map((note) => (
                      <div key={note.id} className="border rounded-lg p-4 bg-white">
                        <h4 className="font-semibold text-primary">{note.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{note.content}</p>
                        {note.sourceUrl ? (
                          <a className="inline-flex items-center gap-1 text-sm text-accent mt-2" href={note.sourceUrl} target="_blank" rel="noopener noreferrer">
                            Source <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No notes for this topic yet.</p>
                  )}
                </FolderSection>

                <FolderSection title="Online Resources Folder">
                  {onlineResources.length ? (
                    onlineResources.map((resource) => (
                      <LinkCard key={resource.id} title={resource.title} description={resource.description} url={resource.url} />
                    ))
                  ) : (
                    <p className="text-muted-foreground">No online resources for this topic yet.</p>
                  )}
                </FolderSection>

                <FolderSection title="Videos Folder">
                  {videos.length ? (
                    videos.map((video) => (
                      <LinkCard key={video.id} title={video.title} description={video.description} url={video.url} />
                    ))
                  ) : (
                    <p className="text-muted-foreground">No videos for this topic yet.</p>
                  )}
                </FolderSection>

                <div className="bg-white/90 rounded-2xl border border-primary/10 p-6">
                  <h3 className="text-2xl text-primary mb-2">PES-PAL Chat or Ask</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Ask only about the selected topic. Keep it specific for better output.
                  </p>
                  <div className="grid md:grid-cols-[180px_1fr_auto] gap-3 items-start">
                    <select
                      value={askMode}
                      onChange={(e) => setAskMode(e.target.value as "explain" | "research")}
                      className="border rounded-md px-3 py-2"
                      aria-label="Select ask mode"
                    >
                      <option value="explain">Explain Topic</option>
                      <option value="research">Research Topic</option>
                    </select>
                    <textarea
                      value={askPrompt}
                      maxLength={200}
                      onChange={(e) => setAskPrompt(e.target.value)}
                      placeholder="Add your question (max 200 chars)"
                      className="border rounded-md px-3 py-2 min-h-24"
                    />
                    <button
                      onClick={handleAskBot}
                      disabled={!askPrompt.trim() || isAsking}
                      className="px-4 py-2 rounded-md bg-primary text-white disabled:opacity-50"
                    >
                      {isAsking ? "Thinking..." : "Ask PES-PAL"}
                    </button>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{askPrompt.length}/200</div>
                  {askMeta ? <p className="mt-3 text-xs text-muted-foreground">{askMeta}</p> : null}
                  {askResponse ? (
                    <pre className="mt-3 whitespace-pre-wrap bg-slate-50 border rounded-md p-3 text-sm text-slate-700">
                      {askResponse}
                    </pre>
                  ) : null}
                </div>
              </>
            )}
          </motion.section>
        )}

        {/* Empty State */}
        {!selectedTopic && !isLoadingTopicData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <div className="inline-flex p-4 rounded-full bg-primary/10 mb-4">
              <ChevronDown className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl mb-2 text-primary">Select a topic to get started</h3>
            <p className="text-muted-foreground">
              Choose your department, semester, subject, module, and topic to view
              notes, online resources, and videos
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}

// ==================== DROPDOWN COMPONENT ====================
function Dropdown({
  label,
  value,
  onChange,
  options,
  disabled,
  isLoading,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled: boolean;
  isLoading: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm text-muted-foreground">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || isLoading}
          aria-label={label}
          className={`w-full px-4 py-3 rounded-xl border appearance-none transition-all ${
            disabled || isLoading
              ? "bg-muted/50 cursor-not-allowed text-muted-foreground border-border"
              : "bg-white text-primary hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20 border-primary/10"
          } focus:outline-none`}
        >
          <option value="" className="bg-white text-primary">
            {isLoading ? "Loading..." : `Select ${label}`}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-white text-primary">
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}

function FolderSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-white/90 rounded-2xl border border-primary/10 p-6">
      <h3 className="text-2xl text-primary mb-3">{title}</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>
    </div>
  );
}

function LinkCard({
  title,
  description,
  url,
}: {
  title: string;
  description: string;
  url: string;
}) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="border rounded-lg p-4 bg-white hover:border-primary/30 transition-colors">
      <h4 className="font-semibold text-primary">{title}</h4>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
      <span className="inline-flex items-center gap-1 text-sm text-accent mt-2">
        Open <ExternalLink className="w-3.5 h-3.5" />
      </span>
    </a>
  );
}