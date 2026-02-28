import { useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, DollarSign, Calendar, User } from "lucide-react";
import { DealCard } from "@/components/DealCard";


export function DealPipeline() {

  const [activeDeal, setActiveDeal] = useState<any>(null);
  
  const { data: stages, isLoading: stagesLoading } = trpc.deals.listStages.useQuery();
  const { data: deals, isLoading: dealsLoading } = trpc.deals.list.useQuery();
  const utils = trpc.useUtils();
  
  const updateStageMutation = trpc.deals.updateStage.useMutation({
    onSuccess: () => {
      utils.deals.list.invalidate();
      console.log("Deal moved successfully");
    },
    onError: (error) => {
      console.error("Error moving deal:", error.message);
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  function handleDragStart(event: DragStartEvent) {
    const deal = deals?.find((d: any) => d.id === event.active.id);
    setActiveDeal(deal);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    
    if (!over) {
      setActiveDeal(null);
      return;
    }

    const dealId = active.id as string;
    const newStageId = over.id as string;

    // Find the deal and check if stage actually changed
    const deal = deals?.find((d: any) => d.id === dealId);
    if (deal && deal.stageId !== newStageId) {
      updateStageMutation.mutate({ dealId, newStageId });
    }

    setActiveDeal(null);
  }

  if (stagesLoading || dealsLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stages || stages.length === 0) {
    return (
      <div className="container py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">No Deal Stages Found</h2>
          <p className="text-muted-foreground mb-6">
            Initialize default stages to start using the deal pipeline
          </p>
          <Button onClick={() => {
            trpc.deals.initializeStages.useMutation({
              onSuccess: () => {
                utils.deals.listStages.invalidate();
                console.log("Stages initialized");
              },
            }).mutate();
          }}>
            Initialize Default Stages
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 px-4 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Deal Pipeline</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage your deals through each stage
          </p>
        </div>
        <Button size="sm" className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          New Deal
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage: any) => {
            const stageDeals = deals?.filter((d: any) => d.stageId === stage.id) || [];
            const stageValue = stageDeals.reduce((sum: number, d: any) => {
              return sum + (parseFloat(d.value) || 0);
            }, 0);

            return (
              <div key={stage.id} className="flex-shrink-0 w-80">
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      <h3 className="font-semibold">{stage.name}</h3>
                      <span className="text-sm text-muted-foreground">
                        ({stageDeals.length})
                      </span>
                    </div>
                    <div className="text-sm font-medium">
                      ${stageValue.toLocaleString()}
                    </div>
                  </div>

                  <SortableContext
                    id={stage.id}
                    items={stageDeals.map((d: any) => d.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2 min-h-[200px]">
                      {stageDeals.map((deal: any) => (
                        <DealCard key={deal.id} deal={deal} />
                      ))}
                    </div>
                  </SortableContext>
                </Card>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeDeal ? <DealCard deal={activeDeal} isDragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
