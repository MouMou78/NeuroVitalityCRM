import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Brain,
  Trash2,
  Plus,
  Search,
  RefreshCw,
  Shield,
  Star,
  TrendingUp,
  MessageSquare,
  User,
  Briefcase,
  Building2,
  Lightbulb,
  Settings,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ReactNode; colour: string }> = {
  contact_insight: { label: "Contact Insight", icon: <User className="h-3 w-3" />, colour: "bg-blue-100 text-blue-800 border-blue-200" },
  deal_insight: { label: "Deal Insight", icon: <Briefcase className="h-3 w-3" />, colour: "bg-green-100 text-green-800 border-green-200" },
  business_context: { label: "Business Context", icon: <Building2 className="h-3 w-3" />, colour: "bg-amber-100 text-amber-800 border-amber-200" },
  team_preference: { label: "Team Preference", icon: <Settings className="h-3 w-3" />, colour: "bg-purple-100 text-purple-800 border-purple-200" },
  user_preference: { label: "User Preference", icon: <User className="h-3 w-3" />, colour: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  key_decision: { label: "Key Decision", icon: <Lightbulb className="h-3 w-3" />, colour: "bg-orange-100 text-orange-800 border-orange-200" },
  follow_up_pattern: { label: "Follow-up Pattern", icon: <TrendingUp className="h-3 w-3" />, colour: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  general: { label: "General", icon: <MessageSquare className="h-3 w-3" />, colour: "bg-gray-100 text-gray-700 border-gray-200" },
};

export default function AIMemoryManager() {
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [newMemoryContent, setNewMemoryContent] = useState("");
  const [newMemoryCategory, setNewMemoryCategory] = useState("business_context");
  const [showAddForm, setShowAddForm] = useState(false);

  // Gate: engineering only
  if (currentUser && currentUser.role !== "engineering") {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center max-w-md">
          <Shield className="h-12 w-12 text-violet-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Engineering Access Only</h2>
          <p className="text-gray-500">
            AI Memory governance is restricted to the Engineering role. Only platform engineers can
            view, edit, or delete the AI's persistent memory.
          </p>
        </div>
      </div>
    );
  }

  const memoriesQuery = trpc.assistant.getMemories.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const deleteMemoryMutation = trpc.assistant.deleteMemory.useMutation({
    onSuccess: () => memoriesQuery.refetch(),
    onError: (err) => alert(`Failed to delete memory: ${err.message}`),
  });

  const addMemoryMutation = trpc.assistant.rememberThis.useMutation({
    onSuccess: () => {
      setNewMemoryContent("");
      setShowAddForm(false);
      memoriesQuery.refetch();
    },
    onError: (err) => alert(`Failed to add memory: ${err.message}`),
  });

  const memories = memoriesQuery.data ?? [];

  const filtered = memories.filter((m) => {
    const matchesSearch =
      searchQuery === "" ||
      m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.entityName && m.entityName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ["all", ...Array.from(new Set(memories.map((m) => m.category)))];

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this memory? The AI will no longer have access to it.")) {
      deleteMemoryMutation.mutate({ id });
    }
  };

  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryContent.trim()) return;
    addMemoryMutation.mutate({ content: newMemoryContent.trim() });
  };

  const importanceColour = (score: number) => {
    if (score >= 8) return "text-red-600";
    if (score >= 6) return "text-amber-600";
    if (score >= 4) return "text-blue-600";
    return "text-gray-400";
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-violet-100 rounded-lg flex-shrink-0 mt-0.5">
            <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-violet-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">AI Memory Manager</h1>
              <Badge className="bg-violet-100 text-violet-800 border-violet-200">
                <Shield className="h-3 w-3 mr-1" />
                Engineering
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Govern what the AI knows and remembers across all sessions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => memoriesQuery.refetch()}
            disabled={memoriesQuery.isFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${memoriesQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Memory
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Memories</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{memories.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">High Importance (8+)</p>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {memories.filter((m) => m.importance >= 8).length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">User-Stated</p>
            <p className="text-2xl font-bold text-violet-600 mt-1">
              {memories.filter((m) => m.source === "user_stated").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">AI-Extracted</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {memories.filter((m) => m.source === "ai_extracted").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add Memory Form */}
      {showAddForm && (
        <Card className="border border-violet-200 bg-violet-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-violet-900">Add a Memory</CardTitle>
            <CardDescription>
              Manually teach the AI something important. This will be stored as a high-importance
              memory and applied immediately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddMemory} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={newMemoryCategory}
                  onChange={(e) => setNewMemoryCategory(e.target.value)}
                  className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 w-full sm:w-auto"
                >
                  {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.label}
                    </option>
                  ))}
                </select>
                <Input
                  value={newMemoryContent}
                  onChange={(e) => setNewMemoryContent(e.target.value)}
                  placeholder="e.g. We always offer a 30-day free trial to NHS clients"
                  className="flex-1"
                  maxLength={500}
                />
                <Button
                  type="submit"
                  disabled={addMemoryMutation.isPending || !newMemoryContent.trim()}
                  className="bg-violet-600 hover:bg-violet-700 text-white w-full sm:w-auto"
                >
                  {addMemoryMutation.isPending ? "Saving..." : "Save Memory"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selectedCategory === cat
                  ? "bg-violet-600 text-white border-violet-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-violet-300"
              }`}
            >
              {cat === "all" ? "All" : CATEGORY_CONFIG[cat]?.label || cat}
              {cat !== "all" && (
                <span className="ml-1 opacity-70">
                  ({memories.filter((m) => m.category === cat).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Memory List */}
      {memoriesQuery.isLoading ? (
        <div className="text-center py-12 text-gray-400">
          <Brain className="h-8 w-8 mx-auto mb-3 animate-pulse" />
          <p>Loading memories...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Brain className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-gray-500">
            {memories.length === 0
              ? "No memories yet — the AI will start learning from your first conversation"
              : "No memories match your search"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((memory) => {
            const catCfg = CATEGORY_CONFIG[memory.category] || CATEGORY_CONFIG.general;
            return (
              <div
                key={memory.id}
                className="flex items-start gap-4 p-4 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors group"
              >
                {/* Category badge */}
                <div className="flex-shrink-0 pt-0.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${catCfg.colour}`}
                  >
                    {catCfg.icon}
                    {catCfg.label}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 leading-relaxed">{memory.content}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                    {memory.entityName && (
                      <span className="text-gray-500 font-medium">re: {memory.entityName}</span>
                    )}
                    <span>
                      {new Date(memory.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span
                      className={`inline-flex items-center gap-0.5 font-medium ${importanceColour(memory.importance)}`}
                    >
                      <Star className="h-3 w-3" />
                      {memory.importance}/10
                    </span>
                    {memory.reinforceCount > 1 && (
                      <span className="text-blue-500">
                        <TrendingUp className="h-3 w-3 inline mr-0.5" />
                        {memory.reinforceCount}× reinforced
                      </span>
                    )}
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs ${
                        memory.source === "user_stated"
                          ? "bg-violet-50 text-violet-600"
                          : "bg-gray-50 text-gray-500"
                      }`}
                    >
                      {memory.source === "user_stated" ? "You stated" : "AI extracted"}
                    </span>
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(memory.id)}
                  disabled={deleteMemoryMutation.isPending}
                  className="flex-shrink-0 p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete memory"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Info footer */}
      <Alert className="border-violet-200 bg-violet-50">
        <AlertCircle className="h-4 w-4 text-violet-600" />
        <AlertDescription className="text-violet-800 text-sm">
          <strong>How memory works:</strong> After every AI conversation, the system automatically
          extracts important facts and stores them here. These memories are injected into every AI
          query, so the AI applies them across all sessions and all team members. Deleting a memory
          removes it permanently — the AI will no longer know it.
        </AlertDescription>
      </Alert>
    </div>
  );
}
