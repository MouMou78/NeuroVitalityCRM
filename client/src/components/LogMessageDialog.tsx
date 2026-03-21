import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Linkedin, Mail } from "lucide-react";

interface LogMessageDialogProps {
  personId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogMessageDialog({ personId, open, onOpenChange }: LogMessageDialogProps) {
  const [messageType, setMessageType] = useState<"linkedin" | "email">("email");
  const [direction, setDirection] = useState<"sent" | "received">("sent");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [hour, setHour] = useState(new Date().getHours().toString().padStart(2, "0"));
  const [minute, setMinute] = useState(new Date().getMinutes().toString().padStart(2, "0"));
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const createMomentMutation = trpc.moments.create.useMutation();

  const handleSubmit = async () => {
    if (!subject.trim() || !content.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setIsLoading(true);

      // Create thread if needed
      const threadSource = messageType === "linkedin" ? "linkedin_messages" : "email";
      const threadIntent = direction === "sent" ? "outbound" : "inbound";

      // Parse the timestamp
      const timestamp = new Date(`${date}T${hour}:${minute}:00`);

      // Create the moment
      await createMomentMutation.mutateAsync({
        threadId: "", // Will be created or found by the backend
        personId,
        type: `${messageType}_message_${direction}` as any,
        content,
        metadata: {
          subject,
          messageType,
          direction,
          timestamp: timestamp.toISOString(),
        },
      });

      toast.success(`${messageType === "linkedin" ? "LinkedIn" : "Email"} message logged successfully`);
      onOpenChange(false);
      
      // Reset form
      setSubject("");
      setContent("");
      setDate(new Date().toISOString().split("T")[0]);
      setHour(new Date().getHours().toString().padStart(2, "0"));
      setMinute(new Date().getMinutes().toString().padStart(2, "0"));
    } catch (error) {
      console.error("Failed to log message:", error);
      toast.error("Failed to log message");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Message</DialogTitle>
          <DialogDescription>
            Capture a LinkedIn or email message with precise timestamp
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Message Type Selection */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={messageType === "email" ? "default" : "outline"}
              onClick={() => setMessageType("email")}
              className="gap-2"
            >
              <Mail className="w-4 h-4" />
              Email
            </Button>
            <Button
              variant={messageType === "linkedin" ? "default" : "outline"}
              onClick={() => setMessageType("linkedin")}
              className="gap-2"
            >
              <Linkedin className="w-4 h-4" />
              LinkedIn
            </Button>
          </div>

          {/* Direction Selection */}
          <div>
            <Label>Direction</Label>
            <Select value={direction} onValueChange={(value: any) => setDirection(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="received">Received</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Hour</Label>
              <Input
                type="number"
                min="0"
                max="23"
                value={hour}
                onChange={(e) => setHour(e.target.value.padStart(2, "0"))}
                className="text-center"
              />
            </div>
            <div>
              <Label className="text-xs">Minute</Label>
              <Input
                type="number"
                min="0"
                max="59"
                value={minute}
                onChange={(e) => setMinute(e.target.value.padStart(2, "0"))}
                className="text-center"
              />
            </div>
          </div>

          {/* Subject */}
          <div>
            <Label>Subject / Title</Label>
            <Input
              placeholder={messageType === "linkedin" ? "Message topic" : "Email subject"}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Content */}
          <div>
            <Label>Message Content</Label>
            <Textarea
              placeholder="Message text..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Log Message"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
