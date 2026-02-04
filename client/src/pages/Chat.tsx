import { useState, useEffect } from "react";
import { Send, Hash, Lock, Plus, Users, Search, Smile, Bot, Circle, MessageSquare, CornerDownRight } from "lucide-react";
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
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";

export default function Chat() {
  const { user } = useAuth();
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDescription, setNewChannelDescription] = useState("");
  const [newChannelType, setNewChannelType] = useState<"public" | "private">("public");
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [viewMode, setViewMode] = useState<"channels" | "dms">("channels");
  const [selectedDmUserId, setSelectedDmUserId] = useState<string | null>(null);
  const [isNewDmOpen, setIsNewDmOpen] = useState(false);
  const [newDmUserId, setNewDmUserId] = useState("");
  const [showThreadPanel, setShowThreadPanel] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null); // messageId or null
  const [replyingToMessage, setReplyingToMessage] = useState<any | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Fetch channels
  const { data: channels = [], refetch: refetchChannels } = trpc.chat.getChannels.useQuery();
  
  // Fetch unread counts
  const { data: unreadCounts = [] } = trpc.chat.getUnreadCounts.useQuery(undefined, {
    refetchInterval: 5000, // Poll every 5 seconds
  });
  
  // Fetch DM conversations
  const { data: dmConversations = [] } = trpc.chat.getDirectMessageConversations.useQuery();
  
  // Fetch DM messages for selected user
  const { data: dmMessages = [] } = trpc.chat.getDirectMessages.useQuery(
    { otherUserId: selectedDmUserId!, limit: 100 },
    { enabled: !!selectedDmUserId, refetchInterval: 3000 }
  );
  
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
  
  const sendDmMutation = trpc.chat.sendDirectMessage.useMutation({
    onSuccess: () => {
      setMessageContent("");
    },
  });
  
  const addReactionMutation = trpc.chat.addReaction.useMutation();
  const removeReactionMutation = trpc.chat.removeReaction.useMutation();
  const markAsReadMutation = trpc.chat.markChannelAsRead.useMutation();
  const updateTypingMutation = trpc.chat.updateTyping.useMutation();
  const clearTypingMutation = trpc.chat.clearTyping.useMutation();
  
  // Fetch typing users for selected channel
  const { data: typingUsers = [] } = trpc.chat.getTypingUsers.useQuery(
    { channelId: selectedChannelId! },
    { 
      enabled: !!selectedChannelId,
      refetchInterval: 2000, // Poll every 2 seconds
    }
  );
  
  // Search messages
  const { data: searchResults = [] } = trpc.chat.searchMessages.useQuery(
    { 
      query: searchQuery,
      channelId: selectedChannelId || undefined,
    },
    { 
      enabled: isSearching && searchQuery.trim().length > 0,
    }
  );

  const handleCreateChannel = () => {
    if (!newChannelName.trim()) return;
    createChannelMutation.mutate({
      name: newChannelName,
      description: newChannelDescription,
      type: newChannelType,
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (16MB limit)
    if (file.size > 16 * 1024 * 1024) {
      alert("File size must be less than 16MB");
      return;
    }
    
    setSelectedFile(file);
  };
  
  const handleSendMessage = async () => {
    if (!messageContent.trim() && !selectedFile) return;
    
    let fileUrl, fileName, fileType, fileSize;
    
    // Upload file if selected
    if (selectedFile) {
      setUploadingFile(true);
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        
        if (!response.ok) throw new Error("Upload failed");
        
        const data = await response.json();
        fileUrl = data.url;
        fileName = selectedFile.name;
        fileType = selectedFile.type;
        fileSize = selectedFile.size;
      } catch (error) {
        console.error("File upload error:", error);
        alert("Failed to upload file");
        setUploadingFile(false);
        return;
      } finally {
        setUploadingFile(false);
      }
    }
    
    if (selectedChannelId) {
      sendMessageMutation.mutate({
        channelId: selectedChannelId,
        content: messageContent || "Shared a file",
        threadId: replyingToMessage?.id,
        fileUrl,
        fileName,
        fileType,
        fileSize,
      });
      setReplyingToMessage(null);
      setSelectedFile(null);
    } else if (selectedDmUserId) {
      sendDmMutation.mutate({
        recipientId: selectedDmUserId,
        content: messageContent || "Shared a file",
      });
      setSelectedFile(null);
    }
  };
  
  const handleEmojiClick = (messageId: string, emojiData: EmojiClickData) => {
    addReactionMutation.mutate({
      messageId,
      emoji: emojiData.emoji,
    });
    setShowEmojiPicker(null);
  };
  
  const handleReplyInThread = (message: any) => {
    setSelectedThreadId(message.id);
    setShowThreadPanel(true);
  };

  const selectedChannel = channels.find((c) => c.id === selectedChannelId);
  
  // Mark channel as read when viewing it
  useEffect(() => {
    if (selectedChannelId) {
      markAsReadMutation.mutate({ channelId: selectedChannelId });
    }
  }, [selectedChannelId, messages.length]); // Re-mark when new messages arrive

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
            <Input 
              placeholder="Search messages" 
              className="pl-8" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.trim()) {
                  setIsSearching(true);
                }
              }}
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {viewMode === "channels" ? (
            <div className="p-2 space-y-1">
              {channels.map((channel) => {
                const unreadCount = unreadCounts.find(uc => uc.channelId === channel.id)?.unreadCount || 0;
                return (
                <button
                  key={channel.id}
                  onClick={() => {
                    setSelectedChannelId(channel.id);
                    setSelectedDmUserId(null);
                  }}
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
                  <span className="truncate flex-1 text-left">{channel.name}</span>
                  {unreadCount > 0 && (
                    <span className="flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                  <div title="AI Assistant is present">
                    <Bot className="h-3 w-3 text-primary" />
                  </div>
                </button>
                );
              })}
              {channels.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No channels yet. Create one to get started!
                </div>
              )}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              <Dialog open={isNewDmOpen} onOpenChange={setIsNewDmOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full mb-2">
                    <Plus className="mr-2 h-4 w-4" />
                    New Message
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Start a Direct Message</DialogTitle>
                    <DialogDescription>
                      Select a user to start a conversation
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="dm-user">Select User</Label>
                      <Input
                        id="dm-user"
                        placeholder="Enter user ID or email"
                        value={newDmUserId}
                        onChange={(e) => setNewDmUserId(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => {
                        if (newDmUserId.trim()) {
                          setSelectedDmUserId(newDmUserId);
                          setSelectedChannelId(null);
                          setIsNewDmOpen(false);
                          setNewDmUserId("");
                        }
                      }}
                    >
                      Start Conversation
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              {dmConversations.map((conv: any) => (
                <button
                  key={conv.otherUserId}
                  onClick={() => {
                    setSelectedDmUserId(conv.otherUserId);
                    setSelectedChannelId(null);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedDmUserId === conv.otherUserId
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  }`}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {conv.otherUserId.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <div className="font-medium truncate">{conv.otherUserId}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {conv.lastMessage}
                    </div>
                  </div>
                </button>
              ))}
              {dmConversations.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No direct messages yet. Start a conversation!
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t space-y-2">
          <Button 
            variant={viewMode === "channels" ? "default" : "outline"} 
            className="w-full justify-start" 
            size="sm"
            onClick={() => setViewMode("channels")}
          >
            <Hash className="mr-2 h-4 w-4" />
            Channels
          </Button>
          <Button 
            variant={viewMode === "dms" ? "default" : "outline"} 
            className="w-full justify-start" 
            size="sm"
            onClick={() => setViewMode("dms")}
          >
            <Users className="mr-2 h-4 w-4" />
            Direct Messages
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChannel || selectedDmUserId ? (
          <>
            {/* Header */}
            <div className="h-14 border-b px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedChannel ? (
                  <>
                    {selectedChannel.type === "public" ? (
                      <Hash className="h-5 w-5" />
                    ) : (
                      <Lock className="h-5 w-5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{selectedChannel.name}</h3>
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                          <Bot className="h-3 w-3" />
                          <span>AI</span>
                        </div>
                      </div>
                      {selectedChannel.description && (
                        <p className="text-xs text-muted-foreground">{selectedChannel.description}</p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {selectedDmUserId?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{selectedDmUserId}</h3>
                      <p className="text-xs text-muted-foreground">Direct Message</p>
                    </div>
                  </>
                )}
              </div>
              {selectedChannel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMembersPanel(!showMembersPanel)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Members
                </Button>
              )}
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {isSearching && searchQuery && (
                <div className="mb-4 flex items-center justify-between bg-accent/50 p-2 rounded-md">
                  <span className="text-sm">
                    {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{searchQuery}"
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsSearching(false);
                      setSearchQuery("");
                    }}
                  >
                    Clear
                  </Button>
                </div>
              )}
              <div className="space-y-4">
                {(isSearching ? searchResults : (selectedChannel ? messages : dmMessages)).map((message: any) => {
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
                        
                        {/* File Attachment */}
                        {message.fileUrl && (
                          <div className="mt-2">
                            {message.fileType?.startsWith("image/") ? (
                              <img
                                src={message.fileUrl}
                                alt={message.fileName || "Image"}
                                className="max-w-xs rounded-lg border"
                              />
                            ) : (
                              <a
                                href={message.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-2 bg-accent rounded-md text-sm hover:bg-accent/80"
                              >
                                <span>📎</span>
                                <span>{message.fileName || "Download file"}</span>
                                {message.fileSize && (
                                  <span className="text-muted-foreground">({(message.fileSize / 1024).toFixed(1)} KB)</span>
                                )}
                              </a>
                            )}
                          </div>
                        )}
                        
                        {/* Message Actions */}
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id)}
                          >
                            <Smile className="h-3 w-3 mr-1" />
                            React
                          </Button>
                          {selectedChannel && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleReplyInThread(message)}
                            >
                              <MessageSquare className="h-3 w-3 mr-1" />
                              Reply in thread
                            </Button>
                          )}
                        </div>
                        
                        {/* Emoji Picker */}
                        {showEmojiPicker === message.id && (
                          <div className="absolute z-50 mt-2">
                            <EmojiPicker onEmojiClick={(emojiData) => handleEmojiClick(message.id, emojiData)} />
                          </div>
                        )}
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
            
            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="px-4 py-2 text-sm text-muted-foreground italic">
                {typingUsers.length === 1
                  ? `${typingUsers[0].userName || "Someone"} is typing...`
                  : typingUsers.length === 2
                  ? `${typingUsers[0].userName || "Someone"} and ${typingUsers[1].userName || "someone else"} are typing...`
                  : `${typingUsers.length} people are typing...`}
              </div>
            )}

            {/* Message Input */}
            <div className="p-4 border-t">
              {replyingToMessage && (
                <div className="mb-2 p-2 bg-accent/30 rounded-md flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <CornerDownRight className="h-4 w-4" />
                    <span className="text-muted-foreground">Replying to {replyingToMessage.user?.name || "Unknown User"}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => setReplyingToMessage(null)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
              {selectedFile && (
                <div className="mb-2 p-2 bg-accent/30 rounded-md flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">📎 {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => setSelectedFile(null)}
                  >
                    Remove
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => document.getElementById("file-upload")?.click()}
                  disabled={uploadingFile}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                  <Input
                    placeholder={selectedChannel ? `Message #${selectedChannel.name} (type @ai or @assistant to invoke AI)` : `Message ${selectedDmUserId}`}
                    value={messageContent}
                    onChange={(e) => {
                      setMessageContent(e.target.value);
                      if (selectedChannelId && e.target.value.trim()) {
                        updateTypingMutation.mutate({ channelId: selectedChannelId });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (selectedChannelId) {
                          clearTypingMutation.mutate({ channelId: selectedChannelId });
                        }
                        handleSendMessage();
                      }
                    }}
                    disabled={uploadingFile}
                  />
                </div>
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={(!messageContent.trim() && !selectedFile) || uploadingFile}
                >
                  {uploadingFile ? "..." : <Send className="h-4 w-4" />}
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

      {/* Thread Panel */}
      {showThreadPanel && selectedThreadId && (
        <ThreadPanel
          threadId={selectedThreadId}
          onClose={() => {
            setShowThreadPanel(false);
            setSelectedThreadId(null);
          }}
        />
      )}

      {/* Members Panel */}
      {showMembersPanel && selectedChannel && (
        <div className="w-64 border-l bg-muted/30">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-sm">Channel Members</h3>
          </div>
          <ScrollArea className="h-[calc(100vh-8rem)]">
            <div className="p-2 space-y-1">
              {/* AI Assistant - Always shown first */}
              <div className="flex items-center gap-2 p-2 rounded hover:bg-accent/50">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">AI Assistant</span>
                    <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                  </div>
                  <p className="text-xs text-muted-foreground">Always online</p>
                </div>
              </div>

              {/* Current User */}
              {user && (
                <div className="flex items-center gap-2 p-2 rounded hover:bg-accent/50">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {user.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{user.name}</span>
                      <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                    </div>
                    <p className="text-xs text-muted-foreground">Online</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

// Thread Panel Component
function ThreadPanel({ threadId, onClose }: { threadId: string; onClose: () => void }) {
  const { user } = useAuth();
  const [replyContent, setReplyContent] = useState("");
  
  // Fetch parent message
  const { data: parentMessage } = trpc.chat.getMessages.useQuery(
    { channelId: "", limit: 1 },
    { enabled: false }
  );
  
  // Fetch thread replies
  const { data: replies = [] } = trpc.chat.getThreadReplies.useQuery(
    { threadId, limit: 100 },
    { enabled: !!threadId, refetchInterval: 3000 }
  );
  
  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      setReplyContent("");
    },
  });
  
  const handleSendReply = () => {
    if (!replyContent.trim()) return;
    
    // Get channelId from first reply or parent message
    const channelId = replies[0]?.channelId;
    if (!channelId) return;
    
    sendMessageMutation.mutate({
      channelId,
      content: replyContent,
      threadId,
    });
  };
  
  return (
    <div className="w-96 border-l bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <h3 className="font-semibold">Thread</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      
      {/* Thread Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {replies.map((message: any) => {
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
          {replies.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <p>No replies yet. Start the thread!</p>
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Reply Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Reply to thread..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendReply();
                }
              }}
            />
          </div>
          <Button
            size="icon"
            onClick={handleSendReply}
            disabled={!replyContent.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
