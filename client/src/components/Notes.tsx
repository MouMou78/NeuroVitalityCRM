import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Edit2, Trash2, Check, X, Link2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface NotesProps {
  entityType: "contact" | "account" | "deal" | "task" | "thread";
  entityId: string;
}

export default function Notes({ entityType, entityId }: NotesProps) {
  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const utils = trpc.useUtils();
  const { data: notes = [], isLoading } = trpc.notes.contextual.useQuery({
    entityType,
    entityId,
  });

  const createNoteMutation = trpc.notes.create.useMutation({
    onSuccess: () => {
      utils.notes.contextual.invalidate({ entityType, entityId });
      setNewNote("");
    },
  });

  const updateNoteMutation = trpc.notes.update.useMutation({
    onSuccess: () => {
      utils.notes.contextual.invalidate({ entityType, entityId });
      setEditingNoteId(null);
      setEditContent("");
    },
  });

  const deleteNoteMutation = trpc.notes.delete.useMutation({
    onSuccess: () => {
      utils.notes.contextual.invalidate({ entityType, entityId });
    },
  });

  const handleCreate = () => {
    if (!newNote.trim()) return;
    createNoteMutation.mutate({
      content: newNote,
      entityType,
      entityId,
    });
  };

  const handleUpdate = (noteId: string) => {
    if (!editContent.trim()) return;
    updateNoteMutation.mutate({
      noteId,
      content: editContent,
    });
  };

  const handleDelete = (noteId: string) => {
    if (confirm("Are you sure you want to delete this note?")) {
      deleteNoteMutation.mutate({ noteId });
    }
  };

  const startEditing = (note: any) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditContent("");
  };

  const formatTimestamp = (date: Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Notes ({notes.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create new note */}
        <div className="space-y-2">
          <Textarea
            placeholder="Add a note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={3}
          />
          <Button
            onClick={handleCreate}
            disabled={!newNote.trim() || createNoteMutation.isPending}
            size="sm"
          >
            {createNoteMutation.isPending ? "Adding..." : "Add Note"}
          </Button>
        </div>

        {/* Notes list */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading notes...</p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No notes yet. Add one above!
          </p>
        ) : (
          <div className="space-y-3">
            {notes.map((note: any) => (
              <div
                key={note.id}
                className="border rounded-lg p-4 space-y-2 bg-card"
              >
                {editingNoteId === note.id ? (
                  /* Edit mode */
                  <div className="space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(note.id)}
                        disabled={!editContent.trim() || updateNoteMutation.isPending}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEditing}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <>
                    {/* Source label for related notes */}
                    {note.source && note.source !== entityType && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                        <Link2 className="h-3 w-3" />
                        <span>
                          From {note.source === "account" ? "Company" : note.source === "thread" ? "Thread" : note.source}:
                          {note.sourceName && ` ${note.sourceName}`}
                        </span>
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{note.createdByName}</span>
                        <span>•</span>
                        <span>{formatTimestamp(note.createdAt)}</span>
                        {note.updatedAt && note.updatedAt !== note.createdAt && (
                          <>
                            <span>•</span>
                            <span className="italic">
                              edited {formatTimestamp(note.updatedAt)}
                              {note.updatedByName && ` by ${note.updatedByName}`}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEditing(note)}
                          className="h-7 w-7 p-0"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(note.id)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
