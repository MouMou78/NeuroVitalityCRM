import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CheckCircle2, Circle, Clock, AlertCircle, Pencil } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export function Tasks() {
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [filter, setFilter] = useState<"all" | "my" | "overdue">("all");

  const { data: allTasks, isLoading, refetch } = trpc.tasks.list.useQuery();
  const { data: myTasks } = trpc.tasks.getByAssignee.useQuery(
    { assignedToId: user?.id || "" },
    { enabled: !!user?.id && filter === "my" }
  );
  const { data: overdueTasks } = trpc.tasks.getOverdue.useQuery(
    undefined,
    { enabled: filter === "overdue" }
  );

  const createMutation = trpc.tasks.create.useMutation({
    onSuccess: () => {
      refetch();
      setIsCreateOpen(false);
    },
  });

  const completeMutation = trpc.tasks.complete.useMutation({
    onSuccess: () => refetch(),
  });

  const deleteMutation = trpc.tasks.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const updateMutation = trpc.tasks.update.useMutation({
    onSuccess: () => {
      refetch();
      setIsEditOpen(false);
      setEditingTask(null);
    },
  });

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    dueDate: "",
    reminderAt: "",
  });

  const handleCreate = () => {
    createMutation.mutate({
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
      reminderAt: formData.reminderAt ? new Date(formData.reminderAt) : undefined,
    });
  };

  const handleEdit = (task: any) => {
    setEditingTask(task);
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editingTask) return;
    updateMutation.mutate({
      taskId: editingTask.id,
      title: editingTask.title,
      description: editingTask.description,
      priority: editingTask.priority,
      status: editingTask.status,
      dueDate: editingTask.dueDate ? new Date(editingTask.dueDate) : undefined,
      reminderAt: editingTask.reminderAt ? new Date(editingTask.reminderAt) : undefined,
    });
  };

  const tasks = filter === "my" ? myTasks : filter === "overdue" ? overdueTasks : allTasks;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "text-red-600 bg-red-100";
      case "high": return "text-orange-600 bg-orange-100";
      case "medium": return "text-yellow-600 bg-yellow-100";
      case "low": return "text-green-600 bg-green-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "in_progress": return <Clock className="h-5 w-5 text-blue-600" />;
      case "cancelled": return <AlertCircle className="h-5 w-5 text-red-600" />;
      default: return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground mt-1">
            Manage your tasks and to-dos
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Task title"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Task description"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="reminderAt">Reminder</Label>
                <Input
                  id="reminderAt"
                  type="datetime-local"
                  value={formData.reminderAt}
                  onChange={(e) => setFormData({ ...formData, reminderAt: e.target.value })}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Set a reminder to get notified via email
                </p>
              </div>

              <Button onClick={handleCreate} className="w-full">
                Create Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          All Tasks
        </Button>
        <Button
          variant={filter === "my" ? "default" : "outline"}
          onClick={() => setFilter("my")}
        >
          My Tasks
        </Button>
        <Button
          variant={filter === "overdue" ? "default" : "outline"}
          onClick={() => setFilter("overdue")}
        >
          Overdue
        </Button>
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {tasks?.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No tasks found</p>
          </Card>
        ) : (
          tasks?.map((task: any) => (
            <Card key={task.id} className="p-4">
              <div className="flex items-start gap-4">
                <button
                  onClick={() => {
                    if (task.status !== "completed") {
                      completeMutation.mutate({ taskId: task.id });
                    }
                  }}
                  className="mt-1"
                >
                  {getStatusIcon(task.status)}
                </button>

                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className={`font-semibold ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {task.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      {task.dueDate && (
                        <span className="text-xs text-muted-foreground">
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {task.linkedEntityType && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Linked to: {task.linkedEntityType} ({task.linkedEntityId})
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(task)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate({ taskId: task.id })}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Edit Task Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editingTask?.title || ""}
                onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                placeholder="Task title"
              />
            </div>

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editingTask?.description || ""}
                onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                placeholder="Task description"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="edit-priority">Priority</Label>
              <Select
                value={editingTask?.priority || "medium"}
                onValueChange={(value: any) => setEditingTask({ ...editingTask, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={editingTask?.status || "todo"}
                onValueChange={(value: any) => setEditingTask({ ...editingTask, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-dueDate">Due Date</Label>
              <Input
                id="edit-dueDate"
                type="date"
                value={editingTask?.dueDate ? new Date(editingTask.dueDate).toISOString().split('T')[0] : ""}
                onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-reminderAt">Reminder</Label>
              <Input
                id="edit-reminderAt"
                type="datetime-local"
                value={editingTask?.reminderAt ? new Date(editingTask.reminderAt).toISOString().slice(0, 16) : ""}
                onChange={(e) => setEditingTask({ ...editingTask, reminderAt: e.target.value })}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Set a reminder to get notified via email
              </p>
            </div>

            <Button onClick={handleUpdate} className="w-full">
              Update Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
