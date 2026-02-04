import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { DollarSign, Calendar, Building2 } from "lucide-react";

interface DealCardProps {
  deal: {
    id: string;
    name: string;
    value?: string;
    currency?: string;
    expectedCloseDate?: Date;
    probability?: number;
    accountId?: string;
  };
  isDragging?: boolean;
}

export function DealCard({ deal, isDragging = false }: DealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className={`p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${isDragging ? 'shadow-lg' : ''}`}>
        <h4 className="font-medium text-sm mb-2">{deal.name}</h4>
        
        <div className="space-y-1 text-xs text-muted-foreground">
          {deal.value && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              <span>
                {deal.currency || 'USD'} {parseFloat(deal.value).toLocaleString()}
              </span>
            </div>
          )}
          
          {deal.expectedCloseDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>
                {new Date(deal.expectedCloseDate).toLocaleDateString()}
              </span>
            </div>
          )}
          
          {deal.probability !== undefined && (
            <div className="flex items-center gap-1">
              <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                <div
                  className="bg-primary h-1.5 rounded-full"
                  style={{ width: `${deal.probability}%` }}
                />
              </div>
              <span className="text-xs">{deal.probability}%</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
