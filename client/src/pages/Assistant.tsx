import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Sparkles, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";
import { Streamdown } from "streamdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  links?: Array<{
    type: "person" | "thread" | "action";
    id: number;
    label: string;
    url: string;
  }>;
  timestamp: Date;
}

export default function Assistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm your CRM assistant. I can help you understand your pipeline, find deals at risk, check on overdue actions, and answer questions about your contacts and threads.\n\nTry asking:\n- \"Show me deals at risk\"\n- \"What's my pipeline health?\"\n- \"Which contacts need follow-up?\"\n- \"How many deals are in each stage?\"",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [, setLocation] = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);

  const queryMutation = trpc.assistant.query.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: data.answer,
          links: data.links,
          timestamp: new Date(),
        },
      ]);
    },
    onError: (error) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `I encountered an error: ${error.message}. Please try rephrasing your question.`,
          timestamp: new Date(),
        },
      ]);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || queryMutation.isPending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    queryMutation.mutate({ query: input });
    setInput("");
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="container mx-auto py-8 h-[calc(100vh-4rem)] flex flex-col">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">AI Assistant</h1>
        </div>
        <p className="text-muted-foreground">
          Ask questions about your pipeline, deals, and contacts
        </p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 p-6" ref={scrollRef}>
          <div className="space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <Streamdown>{message.content}</Streamdown>
                    </div>
                  ) : (
                    <p className="text-sm">{message.content}</p>
                  )}

                  {message.links && message.links.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        Related items:
                      </p>
                      {message.links.map((link) => (
                        <button
                          key={`${link.type}-${link.id}`}
                          onClick={() => setLocation(link.url)}
                          className="flex items-center gap-2 text-sm text-primary hover:underline w-full text-left"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {link.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}

            {queryMutation.isPending && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg p-4 bg-muted">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <p className="text-sm text-muted-foreground">Thinking...</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <form onSubmit={handleSubmit} className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your pipeline, deals, or contacts..."
              disabled={queryMutation.isPending}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!input.trim() || queryMutation.isPending}
              size="icon"
            >
              {queryMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
