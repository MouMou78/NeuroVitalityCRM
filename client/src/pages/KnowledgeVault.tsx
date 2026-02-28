import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Brain, Upload, Link, FileText, Trash2, Search, RefreshCw,
  CheckCircle, Clock, AlertCircle, File, Video, Music, Image,
  Globe, Plus, X, Tag, ChevronDown, ChevronUp, Loader2
} from "lucide-react";

const CATEGORIES = [
  { value: "won_deal", label: "Won Deal" },
  { value: "lost_deal", label: "Lost Deal" },
  { value: "proposal", label: "Proposal / Pitch Deck" },
  { value: "competitor_intel", label: "Competitor Intelligence" },
  { value: "content", label: "Content / Marketing" },
  { value: "product_knowledge", label: "Product Knowledge" },
  { value: "communication", label: "Communication Style" },
  { value: "process", label: "Process / Playbook" },
  { value: "general", label: "General" },
];

function getSourceIcon(sourceType: string | null) {
  switch (sourceType) {
    case "pdf": return <FileText className="w-4 h-4 text-red-500" />;
    case "video": return <Video className="w-4 h-4 text-purple-500" />;
    case "audio": return <Music className="w-4 h-4 text-blue-500" />;
    case "image": return <Image className="w-4 h-4 text-green-500" />;
    case "url": return <Globe className="w-4 h-4 text-cyan-500" />;
    case "text": return <FileText className="w-4 h-4 text-gray-500" />;
    default: return <File className="w-4 h-4 text-gray-400" />;
  }
}

function getStatusBadge(status: string | null) {
  switch (status) {
    case "ready": return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Ready</Badge>;
    case "processing": return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Processing</Badge>;
    case "failed": return <Badge className="bg-red-100 text-red-700 border-red-200"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
    default: return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
  }
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function KnowledgeVault() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addMode, setAddMode] = useState<"file" | "url" | "text">("file");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [urlInput, setUrlInput] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [categoryInput, setCategoryInput] = useState("general");
  const [tagsInput, setTagsInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<{ name: string; progress: number; done: boolean; error?: string }[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  const { data: entries = [], isLoading, refetch } = trpc.knowledgeVault.list.useQuery({
    search: search || undefined,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
  }, { refetchInterval: 10000 }); // Auto-refresh every 10s to catch processing updates

  const ingestUrl = trpc.knowledgeVault.ingestUrl.useMutation({
    onSuccess: () => {
      toast.success("URL added to Knowledge Vault — processing started");
      resetForm();
      setShowAddDialog(false);
      refetch();
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  const ingestText = trpc.knowledgeVault.ingestText.useMutation({
    onSuccess: () => {
      toast.success("Text added to Knowledge Vault — processing started");
      resetForm();
      setShowAddDialog(false);
      refetch();
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  const deleteEntry = trpc.knowledgeVault.delete.useMutation({
    onSuccess: () => {
      toast.success("Entry removed from Knowledge Vault");
      refetch();
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  function resetForm() {
    setUrlInput("");
    setTitleInput("");
    setTextInput("");
    setCategoryInput("general");
    setTagsInput("");
  }

  async function uploadSingleFile(file: File, index: number) {
    setUploadQueue(prev => prev.map((q, i) => i === index ? { ...q, progress: 10 } : q));
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", categoryInput);
      if (tagsInput) formData.append("tags", tagsInput);

      const response = await fetch("/api/vault/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      setUploadQueue(prev => prev.map((q, i) => i === index ? { ...q, progress: 60 } : q));

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Upload failed");
      }
      const { url } = await response.json();

      await ingestUrl.mutateAsync({
        url,
        title: titleInput || file.name,
        category: categoryInput,
        tags: tagsInput ? tagsInput.split(",").map(t => t.trim()).filter(Boolean) : undefined,
      });

      setUploadQueue(prev => prev.map((q, i) => i === index ? { ...q, progress: 100, done: true } : q));
    } catch (err: any) {
      setUploadQueue(prev => prev.map((q, i) => i === index ? { ...q, error: err.message, done: true } : q));
      toast.error(`Failed to upload ${file.name}: ${err.message}`);
    }
  }

  async function handleFiles(files: File[]) {
    if (!files.length) return;
    setIsUploading(true);
    setUploadQueue(files.map(f => ({ name: f.name, progress: 0, done: false })));
    await Promise.all(files.map((f, i) => uploadSingleFile(f, i)));
    setIsUploading(false);
    refetch();
    // Auto-close dialog after a moment if all succeeded
    const allOk = files.length > 0;
    if (allOk) {
      setTimeout(() => {
        setShowAddDialog(false);
        resetForm();
        setUploadQueue([]);
      }, 1200);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    await handleFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      const tags = tagsInput ? tagsInput.split(",").map(t => t.trim()).filter(Boolean) : undefined;

      if (addMode === "url") {
        if (!urlInput) { toast.error("Please enter a URL"); return; }
        await ingestUrl.mutateAsync({
          url: urlInput,
          title: titleInput || undefined,
          category: categoryInput,
          tags,
        });
      } else if (addMode === "text") {
        if (!textInput || !titleInput) { toast.error("Please enter a title and text"); return; }
        await ingestText.mutateAsync({
          title: titleInput,
          text: textInput,
          category: categoryInput,
          tags,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const processingCount = entries.filter(e => e.status === "processing").length;
  const readyCount = entries.filter(e => e.status === "ready").length;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-6 h-6 text-violet-600 flex-shrink-0" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Knowledge Vault</h1>
          </div>
          <p className="text-gray-500 text-sm">
            Feed the AI with files, URLs, videos, and notes. Everything ingested becomes permanent brain memory.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1.5" />Refresh
          </Button>
          <Button size="sm" onClick={() => setShowAddDialog(true)} className="bg-violet-600 hover:bg-violet-700 text-white">
            <Plus className="w-4 h-4 mr-1.5" />Add Knowledge
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <div className="text-2xl font-bold text-gray-900">{entries.length}</div>
          <div className="text-sm text-gray-500">Total Documents</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-2xl font-bold text-green-600">{readyCount}</div>
          <div className="text-sm text-gray-500">Ingested & Active</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-2xl font-bold text-yellow-600">{processingCount}</div>
          <div className="text-sm text-gray-500">Processing</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search knowledge..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Entries list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />Loading...
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed p-16 text-center">
          <Brain className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No knowledge yet</h3>
          <p className="text-gray-400 text-sm mb-6">
            Add your first document, URL, or text note to start building the AI's long-term memory.
          </p>
          <Button onClick={() => setShowAddDialog(true)} className="bg-violet-600 hover:bg-violet-700 text-white">
            <Plus className="w-4 h-4 mr-2" />Add First Document
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <div key={entry.id} className="bg-white rounded-xl border hover:border-violet-200 transition-colors">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getSourceIcon(entry.sourceType)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-gray-900 truncate">{entry.title}</h3>
                      {getStatusBadge(entry.status)}
                      {entry.category && entry.category !== "general" && (
                        <Badge variant="outline" className="text-xs">
                          {CATEGORIES.find(c => c.value === entry.category)?.label || entry.category}
                        </Badge>
                      )}
                    </div>
                    {entry.aiSummary && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{entry.aiSummary}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      {entry.fileName && <span>{entry.fileName}</span>}
                      {entry.fileSize && <span>{formatBytes(entry.fileSize)}</span>}
                      {entry.sourceUrl && entry.sourceType === "url" && (
                        <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer"
                          className="text-violet-500 hover:underline truncate max-w-xs">
                          {entry.sourceUrl}
                        </a>
                      )}
                      {entry.linkedEntityName && (
                        <span className="text-violet-500">→ {entry.linkedEntityName}</span>
                      )}
                      <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                      {entry.tags && entry.tags.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {entry.tags.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {entry.extractedMemories && entry.extractedMemories.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                        className="text-xs text-violet-600"
                      >
                        {entry.extractedMemories.length} memories
                        {expandedId === entry.id ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Remove "${entry.title}" from the Knowledge Vault? This will also delete the ${entry.extractedMemories?.length || 0} memories extracted from it.`)) {
                          deleteEntry.mutate({ vaultId: entry.id });
                        }
                      }}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Expanded memories */}
                {expandedId === entry.id && entry.extractedMemories && entry.extractedMemories.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-2">Memories extracted from this document:</p>
                    <div className="space-y-2">
                      {entry.extractedMemories.map((mem: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 bg-violet-50 rounded-lg p-2">
                          <Brain className="w-3 h-3 text-violet-500 mt-0.5 shrink-0" />
                          <span className="text-xs text-gray-700">{mem.content}</span>
                          <Badge className="ml-auto shrink-0 text-xs bg-violet-100 text-violet-700 border-0">
                            {mem.importance}/10
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Knowledge Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-violet-600" />
              Add to Knowledge Vault
            </DialogTitle>
            <DialogDescription>
              Upload a file, add a URL, or paste text. The AI will extract and remember key insights.
            </DialogDescription>
          </DialogHeader>

          {/* Mode tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {[
              { key: "file", label: "File Upload", icon: Upload },
              { key: "url", label: "URL / Link", icon: Link },
              { key: "text", label: "Paste Text", icon: FileText },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setAddMode(key as any)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-sm font-medium transition-colors ${
                  addMode === key ? "bg-white shadow text-violet-700" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {/* File upload */}
            {addMode === "file" && (
              <div>
                <Label className="mb-1.5 block">Title (optional)</Label>
                <Input
                  placeholder="Document title (auto-detected if blank)"
                  value={titleInput}
                  onChange={e => setTitleInput(e.target.value)}
                  className="mb-3"
                />
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    isDragOver
                      ? "border-violet-400 bg-violet-50"
                      : "border-gray-200 hover:border-violet-300 hover:bg-violet-50"
                  }`}
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                >
                  {isUploading ? (
                    <Loader2 className="w-8 h-8 text-violet-500 animate-spin mx-auto mb-2" />
                  ) : (
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  )}
                  <p className="text-sm font-medium text-gray-700">
                    {isUploading ? "Uploading files..." : "Click to upload or drag & drop"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    PDF, Word, Excel, PowerPoint, TXT, CSV, MP3, MP4, MOV, AVI, JPG, PNG, WebP — up to 500MB
                  </p>
                  <p className="text-xs text-violet-500 mt-1 font-medium">Multiple files supported</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx,.mp3,.wav,.mp4,.mov,.avi,.wmv,.jpg,.jpeg,.png,.webp,.gif,.svg"
                    onChange={handleFileUpload}
                  />
                </div>

                {/* Upload progress queue */}
                {uploadQueue.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {uploadQueue.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs text-gray-600 truncate max-w-[200px]">{item.name}</span>
                            {item.error ? (
                              <span className="text-xs text-red-500">Failed</span>
                            ) : item.done ? (
                              <span className="text-xs text-green-500">Done</span>
                            ) : (
                              <span className="text-xs text-gray-400">{item.progress}%</span>
                            )}
                          </div>
                          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                item.error ? "bg-red-400" : item.done ? "bg-green-400" : "bg-violet-500"
                              }`}
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* URL */}
            {addMode === "url" && (
              <>
                <div>
                  <Label className="mb-1.5 block">URL *</Label>
                  <Input
                    placeholder="https://example.com/article"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    type="url"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block">Title (optional)</Label>
                  <Input
                    placeholder="Auto-detected from page"
                    value={titleInput}
                    onChange={e => setTitleInput(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Text */}
            {addMode === "text" && (
              <>
                <div>
                  <Label className="mb-1.5 block">Title *</Label>
                  <Input
                    placeholder="e.g. NHS Deal Win — Key Factors"
                    value={titleInput}
                    onChange={e => setTitleInput(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block">Content *</Label>
                  <Textarea
                    placeholder="Paste notes, call transcripts, meeting summaries, proposals, or any text..."
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    rows={6}
                  />
                </div>
              </>
            )}

            {/* Category */}
            <div>
              <Label className="mb-1.5 block">Category</Label>
              <Select value={categoryInput} onValueChange={setCategoryInput}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div>
              <Label className="mb-1.5 block">Tags (comma-separated)</Label>
              <Input
                placeholder="e.g. NHS, health-tech, Q1-2026"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
              Cancel
            </Button>
            {addMode !== "file" && (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Brain className="w-4 h-4 mr-2" />}
                Add to Brain
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
