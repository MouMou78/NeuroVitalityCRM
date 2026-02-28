import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Minimize2, Send, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

interface FloatingAIChatProps {
  contextData?: {
    page?: string;
    contactId?: string;
    contactName?: string;
  };
}

const getQuickActionsForPage = (page: string) => {
  const actions: Record<string, string[]> = {
    "/people": [
      "Show contacts needing follow-up",
      "Find my top 5 engaged contacts",
      "Who hasn't been contacted recently?",
    ],
    "/engagement": [
      "What's my engagement rate this week?",
      "Show recent activity trends",
      "Which contacts are most engaged?",
    ],
    "/insights": [
      "Summarize my pipeline status",
      "Show conversion metrics",
      "What are my top performing segments?",
    ],
  };
  
  return actions[page] || [
    "Show my top 5 contacts",
    "What's my sales pipeline status?",
    "Recent engagement activity",
  ];
};

export default function FloatingAIChat({ contextData }: FloatingAIChatProps) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 100, y: window.innerHeight - 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isRecording, setIsRecording] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ type: string; label: string; action: string }>>([]);
  const recognitionRef = useRef<any>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [location] = useLocation();

  const chatMutation = trpc.assistant.chat.useMutation();
  const { refetch: refetchSuggestions } = trpc.assistant.getSuggestions.useQuery(
    { message: input, context: contextData },
    { enabled: false }
  );

  // Initialize with context-aware greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      let greeting = "Hi! I'm your AI assistant. ";
      if (contextData?.contactName) {
        greeting += `I can see you're viewing ${contextData.contactName}'s profile. `;
      } else if (contextData?.page) {
        greeting += `You're on the ${contextData.page} page. `;
      }
      greeting += "How can I help?";
      
      setMessages([{ role: "assistant", content: greeting }]);
    }
  }, [isOpen, contextData]);

  const handleSend = async (message?: string) => {
    const messageToSend = message || input.trim();
    if (!messageToSend || isLoading) return;

    setInput("");
    const newMessages = [...messages, { role: "user" as const, content: messageToSend }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Add context to the message
      let contextualMessage = messageToSend;
      if (contextData?.contactName) {
        contextualMessage = `[Context: Viewing contact ${contextData.contactName}] ${messageToSend}`;
      } else if (contextData?.page) {
        contextualMessage = `[Context: On ${contextData.page} page] ${messageToSend}`;
      }

      const result = await chatMutation.mutateAsync({
        messages: [...messages, { role: "user", content: contextualMessage }],
      });
      
      const assistantMessage = {
        role: "assistant" as const,
        content: result.response
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Fetch suggestions based on the user's message
      const suggestionsResult = await refetchSuggestions();
      if (suggestionsResult.data && suggestionsResult.data.length > 0) {
        setSuggestions(suggestionsResult.data);
      }
    } catch (error: any) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    handleSend(action);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in your browser. Please try Chrome or Edge.');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: Math.max(0, Math.min(window.innerWidth - 64, e.clientX - dragOffset.x)),
          y: Math.max(0, Math.min(window.innerHeight - 64, e.clientY - dragOffset.y)),
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const quickActions = getQuickActionsForPage(location);

  // Do not render AI chat for unauthenticated users — prevents data exposure
  if (authLoading || !isAuthenticated) return null;

  return (
    <>
      {/* Floating Button */}
      <div
        ref={buttonRef}
        className="fixed z-50 cursor-move"
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
        onMouseDown={handleMouseDown}
      >
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all"
          onClick={(e) => {
            e.stopPropagation();
            if (!isDragging) {
              setIsOpen(!isOpen);
              setIsMinimized(false);
            }
          }}
        >
          <Sparkles className="h-6 w-6" />
        </Button>
      </div>

      {/* Chat Panel */}
      {isOpen && (
        <div className={`fixed right-4 bottom-4 z-40 w-96 transition-all ${isMinimized ? 'h-14' : 'h-[600px]'}`}>
          <Card className="h-full flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b bg-primary/5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">AI Assistant</h3>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="h-7 w-7 p-0"
                >
                  <Minimize2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-7 w-7 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <ScrollArea className="flex-1 p-3">
                  <div className="space-y-3">
                    {/* Quick Actions - Only show at start */}
                    {messages.length <= 1 && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Quick asks:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {quickActions.map((action, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors text-xs px-2 py-1"
                              onClick={() => handleQuickAction(action)}
                            >
                              {action}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Messages */}
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[85%] p-2.5 rounded-lg text-sm ${
                          message.role === "user" 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted"
                        }`}>
                          {message.role === "assistant" ? (
                            <Streamdown>{message.content}</Streamdown>
                          ) : (
                            <p className="whitespace-pre-wrap">{message.content}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="max-w-[85%] p-2.5 rounded-lg bg-muted">
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" />
                            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]" />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Smart Suggestions */}
                    {suggestions.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Suggested actions:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {suggestions.map((suggestion, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs px-2 py-1"
                              onClick={() => {
                                window.location.href = suggestion.action;
                              }}
                            >
                              {suggestion.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="p-3 border-t">
                  <div className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask me anything..."
                      disabled={isLoading}
                      className="flex-1 text-sm h-9"
                    />
                    <Button 
                      onClick={handleVoiceInput}
                      disabled={isLoading}
                      size="sm"
                      variant={isRecording ? "default" : "outline"}
                      className={`h-9 w-9 p-0 ${isRecording ? "animate-pulse" : ""}`}
                    >
                      {isRecording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                    </Button>
                    <Button 
                      onClick={() => handleSend()} 
                      disabled={!input.trim() || isLoading}
                      size="sm"
                      className="h-9 w-9 p-0"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
