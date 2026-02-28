import { useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  Handle,
  Position,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Save,
  Mail,
  Clock,
  GitBranch,
  Tag,
  Bell,
  ArrowRightLeft,
  StopCircle,
  Play,
  Trash2,
  Settings2,
} from "lucide-react";

// ─── Node type colours ────────────────────────────────────────────────────────
const NODE_COLORS: Record<string, string> = {
  send: "#6366f1",
  wait: "#f59e0b",
  branch: "#10b981",
  update: "#3b82f6",
  notify: "#8b5cf6",
  enrol: "#ec4899",
  stop: "#ef4444",
};

const NODE_ICONS: Record<string, React.ElementType> = {
  send: Mail,
  wait: Clock,
  branch: GitBranch,
  update: Tag,
  notify: Bell,
  enrol: ArrowRightLeft,
  stop: StopCircle,
};

const NODE_LABELS: Record<string, string> = {
  send: "Send Email",
  wait: "Wait",
  branch: "Branch",
  update: "Update Field",
  notify: "Notify",
  enrol: "Enrol in Workflow",
  stop: "Stop",
};

// ─── Custom node component ────────────────────────────────────────────────────
function EngineNode({ data, selected }: { data: any; selected: boolean }) {
  const color = NODE_COLORS[data.nodeType] || "#6b7280";
  const Icon = NODE_ICONS[data.nodeType] || Settings2;
  return (
    <div
      className={`rounded-xl border-2 bg-card shadow-md min-w-[180px] transition-all ${
        selected ? "ring-2 ring-primary ring-offset-2" : ""
      }`}
      style={{ borderColor: color }}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground" />
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-t-lg"
        style={{ backgroundColor: color + "22" }}
      >
        <Icon className="h-4 w-4 shrink-0" style={{ color }} />
        <span className="text-xs font-semibold" style={{ color }}>
          {NODE_LABELS[data.nodeType] || data.nodeType}
        </span>
      </div>
      <div className="px-3 py-2 text-xs text-muted-foreground max-w-[220px]">
        {data.label || <span className="italic">No label</span>}
      </div>
      {/* Branch node has two output handles */}
      {data.nodeType === "branch" ? (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="yes"
            style={{ left: "30%", background: "#10b981" }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="no"
            style={{ left: "70%", background: "#ef4444" }}
          />
          <div className="flex justify-between px-3 pb-2 text-[10px] text-muted-foreground">
            <span style={{ color: "#10b981" }}>Yes</span>
            <span style={{ color: "#ef4444" }}>No</span>
          </div>
        </>
      ) : (
        <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground" />
      )}
    </div>
  );
}

const nodeTypes: NodeTypes = { engineNode: EngineNode };

// ─── Default empty workflow ───────────────────────────────────────────────────
const defaultNodes: Node[] = [
  {
    id: "entry",
    type: "engineNode",
    position: { x: 250, y: 80 },
    data: { nodeType: "send", label: "Initial outreach email" },
  },
];
const defaultEdges: Edge[] = [];

// ─── Node config forms ────────────────────────────────────────────────────────
function NodeConfigForm({
  node,
  onChange,
}: {
  node: Node;
  onChange: (data: any) => void;
}) {
  const d = node.data;
  const update = (key: string, val: any) => onChange({ ...d, [key]: val });

  switch (d.nodeType) {
    case "send":
      return (
        <div className="space-y-3">
          <div>
            <Label>Label</Label>
            <Input value={d.label || ""} onChange={(e) => update("label", e.target.value)} />
          </div>
          <div>
            <Label>Subject</Label>
            <Input value={d.subject || ""} onChange={(e) => update("subject", e.target.value)} placeholder="Email subject..." />
          </div>
          <div>
            <Label>Body</Label>
            <Textarea rows={5} value={d.body || ""} onChange={(e) => update("body", e.target.value)} placeholder="Email body..." />
          </div>
          <div>
            <Label>From name (optional)</Label>
            <Input value={d.from_name || ""} onChange={(e) => update("from_name", e.target.value)} placeholder="Your name" />
          </div>
        </div>
      );
    case "wait":
      return (
        <div className="space-y-3">
          <div>
            <Label>Label</Label>
            <Input value={d.label || ""} onChange={(e) => update("label", e.target.value)} />
          </div>
          <div>
            <Label>Wait type</Label>
            <Select value={d.waitType || "duration"} onValueChange={(v) => update("waitType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="duration">Fixed duration</SelectItem>
                <SelectItem value="event">Until event occurs</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(d.waitType === "duration" || !d.waitType) && (
            <div className="flex gap-2">
              <div className="flex-1">
                <Label>Duration</Label>
                <Input type="number" min={1} value={d.duration || 3} onChange={(e) => update("duration", parseInt(e.target.value))} />
              </div>
              <div className="flex-1">
                <Label>Unit</Label>
                <Select value={d.unit || "days"} onValueChange={(v) => update("unit", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="weeks">Weeks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          {d.waitType === "event" && (
            <div>
              <Label>Event type to wait for</Label>
              <Select value={d.eventType || "email_replied"} onValueChange={(v) => update("eventType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["email_replied","email_opened","email_clicked","form_submitted","meeting_booked","page_visit"].map(e => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      );
    case "branch":
      return (
        <div className="space-y-3">
          <div>
            <Label>Label</Label>
            <Input value={d.label || ""} onChange={(e) => update("label", e.target.value)} />
          </div>
          <div>
            <Label>Condition type</Label>
            <Select value={d.conditionType || "event_window"} onValueChange={(v) => update("conditionType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="event_window">Event occurred in window</SelectItem>
                <SelectItem value="field_compare">Field comparison</SelectItem>
                <SelectItem value="score_threshold">Lead score threshold</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {d.conditionType === "event_window" && (
            <>
              <div>
                <Label>Event type</Label>
                <Select value={d.eventType || "email_replied"} onValueChange={(v) => update("eventType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["email_replied","email_opened","email_clicked","email_bounced","form_submitted","meeting_booked","page_visit","tag_added"].map(e => (
                      <SelectItem key={e} value={e}>{e.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label>Window (days)</Label>
                  <Input type="number" min={1} value={d.windowDays || 3} onChange={(e) => update("windowDays", parseInt(e.target.value))} />
                </div>
                <div className="flex-1">
                  <Label>Min occurrences</Label>
                  <Input type="number" min={1} value={d.minCount || 1} onChange={(e) => update("minCount", parseInt(e.target.value))} />
                </div>
              </div>
            </>
          )}
          {d.conditionType === "field_compare" && (
            <>
              <div>
                <Label>Field name</Label>
                <Input value={d.field || ""} onChange={(e) => update("field", e.target.value)} placeholder="e.g. company_size" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label>Operator</Label>
                  <Select value={d.operator || "eq"} onValueChange={(v) => update("operator", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["eq","neq","gt","gte","lt","lte","contains","not_contains"].map(op => (
                        <SelectItem key={op} value={op}>{op}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label>Value</Label>
                  <Input value={d.value || ""} onChange={(e) => update("value", e.target.value)} />
                </div>
              </div>
            </>
          )}
          {d.conditionType === "score_threshold" && (
            <div className="flex gap-2">
              <div className="flex-1">
                <Label>Operator</Label>
                <Select value={d.operator || "gte"} onValueChange={(v) => update("operator", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["eq","neq","gt","gte","lt","lte"].map(op => (
                      <SelectItem key={op} value={op}>{op}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label>Score</Label>
                <Input type="number" value={d.score || 50} onChange={(e) => update("score", parseInt(e.target.value))} />
              </div>
            </div>
          )}
        </div>
      );
    case "update":
      return (
        <div className="space-y-3">
          <div>
            <Label>Label</Label>
            <Input value={d.label || ""} onChange={(e) => update("label", e.target.value)} />
          </div>
          <div>
            <Label>Update type</Label>
            <Select value={d.updateType || "field"} onValueChange={(v) => update("updateType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="field">Set field value</SelectItem>
                <SelectItem value="tag">Add tag</SelectItem>
                <SelectItem value="score">Adjust score</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {d.updateType === "field" && (
            <div className="flex gap-2">
              <div className="flex-1">
                <Label>Field</Label>
                <Input value={d.field || ""} onChange={(e) => update("field", e.target.value)} placeholder="field_name" />
              </div>
              <div className="flex-1">
                <Label>Value</Label>
                <Input value={d.value || ""} onChange={(e) => update("value", e.target.value)} />
              </div>
            </div>
          )}
          {d.updateType === "tag" && (
            <div>
              <Label>Tag</Label>
              <Input value={d.tag || ""} onChange={(e) => update("tag", e.target.value)} placeholder="e.g. hot-lead" />
            </div>
          )}
          {d.updateType === "score" && (
            <div>
              <Label>Score delta (+/-)</Label>
              <Input type="number" value={d.delta || 10} onChange={(e) => update("delta", parseInt(e.target.value))} />
            </div>
          )}
        </div>
      );
    case "notify":
      return (
        <div className="space-y-3">
          <div>
            <Label>Label</Label>
            <Input value={d.label || ""} onChange={(e) => update("label", e.target.value)} />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea rows={3} value={d.message || ""} onChange={(e) => update("message", e.target.value)} placeholder="Notification message..." />
          </div>
          <div>
            <Label>Severity</Label>
            <Select value={d.severity || "medium"} onValueChange={(v) => update("severity", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );
    case "enrol":
      return (
        <div className="space-y-3">
          <div>
            <Label>Label</Label>
            <Input value={d.label || ""} onChange={(e) => update("label", e.target.value)} />
          </div>
          <div>
            <Label>Target workflow ID</Label>
            <Input value={d.targetWorkflowId || ""} onChange={(e) => update("targetWorkflowId", e.target.value)} placeholder="workflow-uuid" />
          </div>
        </div>
      );
    case "stop":
      return (
        <div className="space-y-3">
          <div>
            <Label>Label</Label>
            <Input value={d.label || ""} onChange={(e) => update("label", e.target.value)} />
          </div>
          <div>
            <Label>Outcome reason</Label>
            <Select value={d.outcome || "completed"} onValueChange={(v) => update("outcome", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                <SelectItem value="bounced">Bounced</SelectItem>
                <SelectItem value="opted_out">Opted out</SelectItem>
                <SelectItem value="manual_stop">Manual stop</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );
    default:
      return <p className="text-sm text-muted-foreground">No configuration for this node type.</p>;
  }
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function WorkflowBuilder() {
  const [, navigate] = useLocation();
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);
  const [workflowName, setWorkflowName] = useState("New Workflow");
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const nodeIdCounter = useRef(2);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  const addNode = (nodeType: string) => {
    const id = `node-${nodeIdCounter.current++}`;
    const newNode: Node = {
      id,
      type: "engineNode",
      position: { x: 150 + Math.random() * 200, y: 200 + Math.random() * 200 },
      data: { nodeType, label: NODE_LABELS[nodeType] },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
    setConfigOpen(true);
  }, []);

  const updateNodeData = (data: any) => {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((n) => (n.id === selectedNode.id ? { ...n, data } : n))
    );
    setSelectedNode((prev) => (prev ? { ...prev, data } : prev));
  };

  const deleteSelectedNode = () => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) =>
      eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id)
    );
    setConfigOpen(false);
    setSelectedNode(null);
  };

  const buildDefinition = () => ({
    workflow_id: crypto.randomUUID(),
    name: workflowName,
    version: 1,
    entry_node_id: nodes[0]?.id || "entry",
    nodes: nodes.map((n) => ({
      node_id: n.id,
      type: n.data.nodeType,
      label: n.data.label,
      config: n.data,
      edges: edges
        .filter((e) => e.source === n.id)
        .reduce((acc: Record<string, string>, e) => {
          acc[e.sourceHandle || "default"] = e.target;
          return acc;
        }, {}),
    })),
  });

  const handleSave = async () => {
    if (!workflowName.trim()) {
      toast.error("Please enter a workflow name");
      return;
    }
    if (nodes.length === 0) {
      toast.error("Add at least one node before saving");
      return;
    }
    setSaving(true);
    try {
      const definition = buildDefinition();
      const res = await fetch("/api/engine/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: workflowName, definition }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Workflow saved successfully");
      navigate("/engine/workflows");
    } catch (err: any) {
      toast.error(err.message || "Failed to save workflow");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-card shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate("/engine/workflows")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Input
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          className="max-w-xs font-semibold text-base border-none shadow-none focus-visible:ring-0 px-0"
        />
        <Badge variant="outline" className="text-xs">Draft</Badge>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => toast.info("Preview coming soon")}>
            <Play className="h-3.5 w-3.5 mr-1" /> Preview
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-3.5 w-3.5 mr-1" />
            {saving ? "Saving..." : "Save Workflow"}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — node palette */}
        <div className="w-52 border-r bg-card flex flex-col gap-1 p-3 shrink-0 overflow-y-auto">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Add Node
          </p>
          {Object.entries(NODE_LABELS).map(([type, label]) => {
            const Icon = NODE_ICONS[type];
            const color = NODE_COLORS[type];
            return (
              <button
                key={type}
                onClick={() => addNode(type)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
              >
                <div
                  className="h-6 w-6 rounded flex items-center justify-center shrink-0"
                  style={{ backgroundColor: color + "22" }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color }} />
                </div>
                {label}
              </button>
            );
          })}
          <Separator className="my-2" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Click a node on the canvas to configure it. Drag from a handle to connect nodes.
          </p>
        </div>

        {/* Canvas */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-muted/20"
          >
            <Background />
            <Controls />
            <MiniMap nodeColor={(n) => NODE_COLORS[n.data?.nodeType] || "#6b7280"} />
            <Panel position="top-right">
              <div className="bg-card border rounded-lg px-3 py-2 text-xs text-muted-foreground shadow-sm">
                {nodes.length} nodes · {edges.length} edges
              </div>
            </Panel>
          </ReactFlow>
        </div>
      </div>

      {/* Node config dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedNode && (() => {
                const Icon = NODE_ICONS[selectedNode.data.nodeType] || Settings2;
                const color = NODE_COLORS[selectedNode.data.nodeType] || "#6b7280";
                return (
                  <>
                    <div
                      className="h-6 w-6 rounded flex items-center justify-center"
                      style={{ backgroundColor: color + "22" }}
                    >
                      <Icon className="h-4 w-4" style={{ color }} />
                    </div>
                    Configure {NODE_LABELS[selectedNode.data.nodeType] || "Node"}
                  </>
                );
              })()}
            </DialogTitle>
          </DialogHeader>
          {selectedNode && (
            <NodeConfigForm node={selectedNode} onChange={updateNodeData} />
          )}
          <DialogFooter className="flex justify-between">
            <Button variant="destructive" size="sm" onClick={deleteSelectedNode}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete node
            </Button>
            <Button onClick={() => setConfigOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
