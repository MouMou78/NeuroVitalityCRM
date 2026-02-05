// Pre-configured automation rule templates for common CRM scenarios

export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: "lead_nurturing" | "deal_management" | "task_automation" | "notifications";
  tags: string[];
  triggerType: "email_opened" | "email_replied" | "no_reply_after_days" | "meeting_held" | "stage_entered" | "deal_value_threshold" | "scheduled";
  triggerConfig: Record<string, any>;
  actionType: "move_stage" | "send_notification" | "create_task" | "enroll_sequence" | "update_field";
  actionConfig: Record<string, any>;
  conditions?: {
    logic: 'AND' | 'OR';
    rules: Array<{
      field: string;
      operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty';
      value: any;
    }>;
  };
  priority: number;
}

export const automationTemplates: AutomationTemplate[] = [
  // Lead Nurturing Templates
  {
    id: "template-follow-up-no-reply",
    name: "Auto Follow-up After No Reply",
    description: "Automatically create a follow-up task when a contact doesn't reply to your email within 3 days",
    category: "lead_nurturing",
    tags: ["follow-up", "email", "engagement"],
    triggerType: "no_reply_after_days",
    triggerConfig: { days: 3 },
    actionType: "create_task",
    actionConfig: {
      title: "Follow up with {{contact_name}}",
      description: "No reply received after 3 days. Time to follow up.",
      priority: "high"
    },
    priority: 5
  },
  {
    id: "template-engage-opener",
    name: "Engage Email Openers",
    description: "Send notification when a high-value contact opens your email, indicating interest",
    category: "lead_nurturing",
    tags: ["email", "engagement", "hot-lead"],
    triggerType: "email_opened",
    triggerConfig: {},
    actionType: "send_notification",
    actionConfig: {
      title: "Hot Lead Alert",
      message: "{{contact_name}} just opened your email!"
    },
    conditions: {
      logic: 'AND',
      rules: [
        { field: 'contact_score', operator: 'greater_than', value: 70 }
      ]
    },
    priority: 8
  },
  {
    id: "template-reply-task",
    name: "Create Task on Email Reply",
    description: "Automatically create a task to review and respond when a contact replies to your email",
    category: "lead_nurturing",
    tags: ["email", "response", "task"],
    triggerType: "email_replied",
    triggerConfig: {},
    actionType: "create_task",
    actionConfig: {
      title: "Review reply from {{contact_name}}",
      description: "Contact has replied. Review and respond promptly.",
      priority: "high"
    },
    priority: 7
  },

  // Deal Management Templates
  {
    id: "template-meeting-to-proposal",
    name: "Move to Proposal After Meeting",
    description: "Automatically advance deals to Proposal stage after a meeting is held",
    category: "deal_management",
    tags: ["meeting", "stage", "progression"],
    triggerType: "meeting_held",
    triggerConfig: {},
    actionType: "move_stage",
    actionConfig: { toStage: "proposal" },
    conditions: {
      logic: 'AND',
      rules: [
        { field: 'deal_stage', operator: 'equals', value: 'meeting' }
      ]
    },
    priority: 6
  },
  {
    id: "template-high-value-alert",
    name: "Alert on High-Value Deal",
    description: "Send notification when a deal value exceeds $50,000 to ensure proper attention",
    category: "deal_management",
    tags: ["deal-value", "alert", "high-priority"],
    triggerType: "deal_value_threshold",
    triggerConfig: { threshold: 50000 },
    actionType: "send_notification",
    actionConfig: {
      title: "High-Value Deal Alert",
      message: "Deal {{deal_name}} has reached ${{deal_value}}. Requires senior attention."
    },
    priority: 9
  },
  {
    id: "template-stale-deal-detection",
    name: "Detect Stale Deals",
    description: "Create task to review deals that have been in the same stage for more than 14 days",
    category: "deal_management",
    tags: ["stale", "review", "pipeline-health"],
    triggerType: "scheduled",
    triggerConfig: {},
    actionType: "create_task",
    actionConfig: {
      title: "Review stale deal: {{deal_name}}",
      description: "This deal has been inactive for 14+ days. Time to re-engage or close.",
      priority: "medium"
    },
    conditions: {
      logic: 'AND',
      rules: [
        { field: 'days_in_stage', operator: 'greater_than', value: 14 },
        { field: 'deal_stage', operator: 'not_equals', value: 'closed_won' },
        { field: 'deal_stage', operator: 'not_equals', value: 'closed_lost' }
      ]
    },
    priority: 4
  },
  {
    id: "template-proposal-to-negotiation",
    name: "Advance to Negotiation",
    description: "Move deals to Negotiation stage when they enter Proposal stage with high engagement score",
    category: "deal_management",
    tags: ["stage", "progression", "automation"],
    triggerType: "stage_entered",
    triggerConfig: { fromStage: "proposal" },
    actionType: "move_stage",
    actionConfig: { toStage: "negotiation" },
    conditions: {
      logic: 'AND',
      rules: [
        { field: 'engagement_score', operator: 'greater_than', value: 80 }
      ]
    },
    priority: 5
  },

  // Task Automation Templates
  {
    id: "template-meeting-follow-up",
    name: "Meeting Follow-up Task",
    description: "Automatically create a follow-up task 1 day after a meeting is held",
    category: "task_automation",
    tags: ["meeting", "follow-up", "task"],
    triggerType: "meeting_held",
    triggerConfig: {},
    actionType: "create_task",
    actionConfig: {
      title: "Follow up on meeting with {{contact_name}}",
      description: "Send meeting notes and next steps to attendees.",
      priority: "high",
      dueInDays: 1
    },
    priority: 7
  },
  {
    id: "template-daily-task-review",
    name: "Daily Task Review Reminder",
    description: "Create a daily reminder at 9am to review your tasks for the day",
    category: "task_automation",
    tags: ["daily", "reminder", "productivity"],
    triggerType: "scheduled",
    triggerConfig: {},
    actionType: "send_notification",
    actionConfig: {
      title: "Daily Task Review",
      message: "Good morning! Review your tasks for today and prioritize your work."
    },
    priority: 3
  },
  {
    id: "template-overdue-task-alert",
    name: "Overdue Task Alert",
    description: "Send notification when tasks become overdue to ensure nothing falls through the cracks",
    category: "task_automation",
    tags: ["overdue", "alert", "deadline"],
    triggerType: "scheduled",
    triggerConfig: {},
    actionType: "send_notification",
    actionConfig: {
      title: "Overdue Task Alert",
      message: "You have {{overdue_count}} overdue tasks. Review and update them."
    },
    conditions: {
      logic: 'AND',
      rules: [
        { field: 'task_status', operator: 'not_equals', value: 'completed' },
        { field: 'due_date', operator: 'less_than', value: 'today' }
      ]
    },
    priority: 8
  },

  // Notification Templates
  {
    id: "template-weekly-pipeline-review",
    name: "Weekly Pipeline Review",
    description: "Send weekly notification every Monday at 9am to review pipeline health and key metrics",
    category: "notifications",
    tags: ["weekly", "pipeline", "review"],
    triggerType: "scheduled",
    triggerConfig: {},
    actionType: "send_notification",
    actionConfig: {
      title: "Weekly Pipeline Review",
      message: "Time for your weekly pipeline review. Check deal progress and identify blockers."
    },
    priority: 4
  },
  {
    id: "template-new-hot-lead",
    name: "New Hot Lead Alert",
    description: "Notify immediately when a new contact is created with a high lead score",
    category: "notifications",
    tags: ["hot-lead", "alert", "new-contact"],
    triggerType: "stage_entered",
    triggerConfig: { fromStage: "new" },
    actionType: "send_notification",
    actionConfig: {
      title: "New Hot Lead",
      message: "New high-value contact: {{contact_name}} (Score: {{lead_score}})"
    },
    conditions: {
      logic: 'AND',
      rules: [
        { field: 'lead_score', operator: 'greater_than', value: 85 }
      ]
    },
    priority: 9
  },
  {
    id: "template-deal-won-celebration",
    name: "Deal Won Celebration",
    description: "Send congratulatory notification when a deal is marked as won",
    category: "notifications",
    tags: ["win", "celebration", "success"],
    triggerType: "stage_entered",
    triggerConfig: { fromStage: "closed_won" },
    actionType: "send_notification",
    actionConfig: {
      title: "Deal Won!",
      message: "Congratulations! {{deal_name}} worth ${{deal_value}} has been won!"
    },
    priority: 10
  }
];

export function getTemplatesByCategory(category?: string) {
  if (!category) return automationTemplates;
  return automationTemplates.filter(t => t.category === category);
}

export function getTemplateById(id: string) {
  return automationTemplates.find(t => t.id === id);
}

export function searchTemplates(query: string) {
  const lowerQuery = query.toLowerCase();
  return automationTemplates.filter(t => 
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}
