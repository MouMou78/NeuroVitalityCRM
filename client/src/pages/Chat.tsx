import { useState } from "react";
import { Send, Hash, Lock, Plus, Users, Search, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Chat() {
  const { user } = useAuth();
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDescription, setNewChannelDescription] = useState("");
  const [newChannelType, setNewChannelType] = useState<"public" | "private">("public");
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);

  // Fetch channels
  const { data: channels = [], refetch: refetchChannels } = trpc.chat.getChannels.useQuery();
  
  // Fetch messages for selected channel with auto-refresh
  const { data: messages = [] } = trpc.chat.getMessages.useQuery(
    { channelId: selectedChannelId! },
    { 
      enabled: !!selectedChannelId,
      refetchInterval: 3000, // Poll every 3 seconds for new messages
    }
  );

  // Mutations
  const createChannelMutation = trpc.chat.createChannel.useMutation({
    onSuccess: () => {
      refetchChannels();
      setIsCreateChannelOpen(false);
      setNewChannelName("");
      setNewChannelDescription("");
      setNewChannelType("public");
    },
  });

  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      setMessageContent("");
    },
  });

  const handleCreateChannel = () => {
    if (!newChannelName.trim()) return;
    createChannelMutation.mutate({
      name: newChannelName,
      description: newChannelDescription,
      type: newChannelType,
    });
  };

  const handleSendMessage = () => {
    if (!messageContent.trim() || !selectedChannelId) return;
    sendMessageMutation.mutate({
      channelId: selectedChannelId,
      content: messageContent,
    });
  };

  const selectedChannel = channels.find((c) => c.id === selectedChannelId);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Sidebar - Channel List */}
      <div className="w-64 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Channels</h2>
            <Dialog open={isCreateChannelOpen} onOpenChange={setIsCreateChannelOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Channel</DialogTitle>
                  <DialogDescription>
                    Create a new channel for your team to collaborate.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Channel Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g. marketing"
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="What's this channel about?"
                      value={newChannelDescription}
                      onChange={(e) => setNewChannelDescription(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Visibility</Label>
                    <RadioGroup value={newChannelType} onValueChange={(v) => setNewChannelType(v as "public" | "private")}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="public" id="public" />
                        <Label htmlFor="public" className="font-normal cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            <span>Public - Anyone can join</span>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="private" id="private" />
                        <Label htmlFor="private" className="font-normal cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            <span>Private - Invite only</span>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateChannelOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateChannel} disabled={!newChannelName.trim()}>
                    Create Channel
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search channels" className="pl-8" />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => setSelectedChannelId(channel.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  selectedChannelId === channel.id
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                }`}
              >
                {channel.type === "public" ? (
                  <Hash className="h-4 w-4" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                <span className="truncate">{channel.name}</span>
              </button>
            ))}
            {channels.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8">
                No channels yet. Create one to get started!
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          <Button variant="outline" className="w-full justify-start" size="sm">
            <Users className="mr-2 h-4 w-4" />
            Direct Messages
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChannel ? (
          <>
            {/* Channel Header */}
            <div className="h-14 border-b px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedChannel.type === "public" ? (
                  <Hash className="h-5 w-5" />
                ) : (
                  <Lock className="h-5 w-5" />
                )}
                <div>
                  <h3 className="font-semibold">{selectedChannel.name}</h3>
                  {selectedChannel.description && (
                    <p className="text-xs text-muted-foreground">{selectedChannel.description}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => {
                  const isAI = message.userId === "ai-assistant-bot";
                  return (
                    <div key={message.id} className={`flex gap-3 ${isAI ? "bg-accent/30 -mx-4 px-4 py-3 rounded-lg" : ""}`}>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className={isAI ? "bg-primary text-primary-foreground" : ""}>
                          {isAI ? "AI" : (message.user?.name?.charAt(0) || "U")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className={`font-semibold text-sm ${isAI ? "text-primary" : ""}`}>
                            {isAI ? "AI Assistant" : (message.user?.name || "Unknown User")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(message.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  );
                })}
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder={`Message #${selectedChannel.name} (type @ai or @assistant to invoke AI)`}
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                </div>
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!messageContent.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Hash className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a channel to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
