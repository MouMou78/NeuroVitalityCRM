import { useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import SequenceFlowBuilder from '@/components/SequenceFlowBuilder';
import { toast } from 'sonner';
import type { Node, Edge } from 'reactflow';

export default function SequenceBuilderVisual() {
  const [, navigate] = useLocation();
  const [, params] = useRoute('/sequences/builder/:id');
  const sequenceId = params?.id;

  const { data: sequence, isLoading } = trpc.sequences.getConditional.useQuery(
    { id: sequenceId! },
    { enabled: !!sequenceId }
  );

  const createMutation = trpc.sequences.createConditional.useMutation({
    onSuccess: (data) => {
      toast.success('Sequence saved successfully!');
      navigate(`/sequences/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save sequence');
    },
  });

  const updateMutation = trpc.sequences.updateConditional.useMutation({
    onSuccess: () => {
      toast.success('Sequence updated successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update sequence');
    },
  });

  const handleSave = async (nodes: Node[], edges: Edge[]) => {
    if (!nodes.length) {
      toast.error('Please add at least one node to the sequence');
      return;
    }

    const sequenceData = {
      name: 'New Conditional Sequence',
      description: 'Created with visual builder',
      nodes: nodes.map((node) => ({
        id: node.id,
        nodeType: node.type || 'email',
        position: node.position,
        ...node.data,
      })),
      edges: edges.map((edge) => ({
        id: edge.id!,
        sourceNodeId: edge.source,
        targetNodeId: edge.target,
        edgeType: edge.data?.edgeType || 'default',
        label: edge.label as string | undefined,
      })),
    };

    if (sequenceId) {
      await updateMutation.mutateAsync({ id: sequenceId, ...sequenceData });
    } else {
      await createMutation.mutateAsync(sequenceData);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/sequences')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sequences
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {sequenceId ? 'Edit Sequence' : 'Build New Sequence'}
            </h1>
            <p className="text-sm text-muted-foreground">
              Drag and connect nodes to create your sequence flow
            </p>
          </div>
        </div>
      </div>

      <SequenceFlowBuilder
        sequenceId={sequenceId}
        initialNodes={sequence?.nodes || []}
        initialEdges={sequence?.edges || []}
        onSave={handleSave}
      />
    </div>
  );
}
