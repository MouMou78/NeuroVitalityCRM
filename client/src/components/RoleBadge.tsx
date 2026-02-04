import { cn } from "@/lib/utils";

export type BuyingRole = "Decision Maker" | "Champion" | "Influencer" | "User" | "Blocker" | null;

interface RoleBadgeProps {
  role: BuyingRole;
  className?: string;
}

// Flat, calm, premium badge design with subtle visual differences
// Following user preference: no gradients, no cartoon effects, personal markers not competitive achievements
const roleStyles: Record<NonNullable<BuyingRole>, { border: string; bg: string; text: string }> = {
  "Decision Maker": {
    border: "border-2 border-purple-500/40",
    bg: "bg-purple-500/10",
    text: "text-purple-700 dark:text-purple-300",
  },
  "Champion": {
    border: "border-2 border-blue-500/40",
    bg: "bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-300",
  },
  "Influencer": {
    border: "border border-green-500/40",
    bg: "bg-green-500/10",
    text: "text-green-700 dark:text-green-300",
  },
  "User": {
    border: "border border-gray-400/40",
    bg: "bg-gray-400/10",
    text: "text-gray-700 dark:text-gray-300",
  },
  "Blocker": {
    border: "border border-red-500/40",
    bg: "bg-red-500/10",
    text: "text-red-700 dark:text-red-300",
  },
};

export function RoleBadge({ role, className }: RoleBadgeProps) {
  if (!role) return null;

  const styles = roleStyles[role];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        styles.border,
        styles.bg,
        styles.text,
        className
      )}
    >
      {role}
    </span>
  );
}
