"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { BotNode, BotConnection, NodeType, BotWorkflow } from "@/types";
import { NODE_DEF_MAP, NODE_DEFS, NODE_CATEGORIES, VarEmit } from "./node-defs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  X,
  GripVertical,
  Trash2,
  ChevronDown,
  ChevronRight,
  Zap,
} from "lucide-react";

// ====== HELPERS ======

let nextId = 1;
function uid() {
  return `n_${Date.now()}_${nextId++}`;
}

/** Walk upstream from a node to collect all emitted variables from connected ancestors */
function getAvailableVariables(
  nodeId: string,
  nodes: BotNode[],
  connections: BotConnection[]
): VarEmit[] {
  const visited = new Set<string>();
  const vars: VarEmit[] = [];
  const seen = new Set<string>();

  function walk(nId: string) {
    if (visited.has(nId)) return;
    visited.add(nId);
    // Find all connections where this node is the target
    const incoming = connections.filter((c) => c.targetNodeId === nId);
    for (const conn of incoming) {
      const sourceNode = nodes.find((n) => n.id === conn.sourceNodeId);
      if (!sourceNode) continue;
      const def = NODE_DEF_MAP[sourceNode.type];
      if (def) {
        for (const v of def.emits) {
          if (!seen.has(v.name)) {
            seen.add(v.name);
            vars.push(v);
          }
        }
      }
      // Continue walking upstream
      walk(conn.sourceNodeId);
    }
  }

  walk(nodeId);
  return vars;
}

function portPos(
  nodeId: string,
  port: string,
  side: "input" | "output",
  canvas: HTMLDivElement | null,
  pan: { x: number; y: number },
  zoom: number
): { x: number; y: number } | null {
  if (!canvas) return null;
  const el = canvas.querySelector(`[data-port="${nodeId}__${port}__${side}"]`) as HTMLElement | null;
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  return {
    x: (rect.x + rect.width / 2 - canvasRect.x - pan.x) / zoom,
    y: (rect.y + rect.height / 2 - canvasRect.y - pan.y) / zoom,
  };
}

// ====== COMPONENT ======

interface NodeEditorCanvasProps {
  workflow: BotWorkflow;
  onSave: (nodes: BotNode[], connections: BotConnection[]) => void;
}

export function NodeEditorCanvas({ workflow, onSave }: NodeEditorCanvasProps) {
  const [nodes, setNodes] = useState<BotNode[]>(workflow.nodes || []);
  const [connections, setConnections] = useState<BotConnection[]>(workflow.connections || []);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [paletteSearch, setPaletteSearch] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [draggingNode, setDraggingNode] = useState<{ nodeId: string; offsetX: number; offsetY: number } | null>(null);
  const [connecting, setConnecting] = useState<{ nodeId: string; port: string; side: "output" } | null>(null);
  const [connectMouse, setConnectMouse] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const [, forceRender] = useState(0);

  // Auto-save debounced
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      onSave(nodes, connections);
    }, 1500);
    return () => clearTimeout(saveTimeout.current);
  }, [nodes, connections, onSave]);

  // Force re-render after mount for port positions
  useEffect(() => {
    const t = setTimeout(() => forceRender((c) => c + 1), 50);
    return () => clearTimeout(t);
  }, [nodes.length]);

  // ====== Pan / Zoom ======
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      setZoom((z) => Math.min(2, Math.max(0.25, z + delta)));
    },
    []
  );

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault();
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      } else if (e.button === 0 && e.target === e.currentTarget) {
        setSelectedNodeId(null);
      }
    },
    [pan]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      }
      if (draggingNode) {
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (!canvasRect) return;
        const x = (e.clientX - canvasRect.x - pan.x) / zoom - draggingNode.offsetX;
        const y = (e.clientY - canvasRect.y - pan.y) / zoom - draggingNode.offsetY;
        setNodes((prev) =>
          prev.map((n) => (n.id === draggingNode.nodeId ? { ...n, position: { x, y } } : n))
        );
      }
      if (connecting) {
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (!canvasRect) return;
        setConnectMouse({
          x: (e.clientX - canvasRect.x - pan.x) / zoom,
          y: (e.clientY - canvasRect.y - pan.y) / zoom,
        });
      }
    },
    [isPanning, panStart, draggingNode, connecting, pan, zoom]
  );

  const handleCanvasMouseUp = useCallback(() => {
    setIsPanning(false);
    setDraggingNode(null);
    setConnecting(null);
  }, []);

  // ====== Node Drag ======
  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const offsetX = (e.clientX - canvasRect.x - pan.x) / zoom - node.position.x;
      const offsetY = (e.clientY - canvasRect.y - pan.y) / zoom - node.position.y;
      setDraggingNode({ nodeId, offsetX, offsetY });
      setSelectedNodeId(nodeId);
    },
    [nodes, pan, zoom]
  );

  // ====== Port Click (connections) ======
  const handlePortMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string, port: string, side: "input" | "output") => {
      e.stopPropagation();
      if (side === "output") {
        setConnecting({ nodeId, port, side: "output" });
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (canvasRect) {
          setConnectMouse({
            x: (e.clientX - canvasRect.x - pan.x) / zoom,
            y: (e.clientY - canvasRect.y - pan.y) / zoom,
          });
        }
      }
    },
    [pan, zoom]
  );

  const handlePortMouseUp = useCallback(
    (e: React.MouseEvent, nodeId: string, port: string, side: "input" | "output") => {
      e.stopPropagation();
      if (connecting && side === "input" && connecting.nodeId !== nodeId) {
        // Prevent duplicate
        const exists = connections.some(
          (c) => c.sourceNodeId === connecting.nodeId && c.sourcePort === connecting.port && c.targetNodeId === nodeId && c.targetPort === port
        );
        if (!exists) {
          // Remove any existing connection to this input
          setConnections((prev) => [
            ...prev.filter((c) => !(c.targetNodeId === nodeId && c.targetPort === port)),
            {
              id: uid(),
              sourceNodeId: connecting.nodeId,
              sourcePort: connecting.port,
              targetNodeId: nodeId,
              targetPort: port,
            },
          ]);
        }
      }
      setConnecting(null);
    },
    [connecting, connections]
  );

  // ====== Add Node from Palette ======
  const addNode = useCallback(
    (type: NodeType) => {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      const x = canvasRect ? (canvasRect.width / 2 - pan.x) / zoom : 300;
      const y = canvasRect ? (canvasRect.height / 2 - pan.y) / zoom : 200;
      const node: BotNode = {
        id: uid(),
        type,
        position: { x: x + Math.random() * 60 - 30, y: y + Math.random() * 60 - 30 },
        data: {},
      };
      setNodes((prev) => [...prev, node]);
      setSelectedNodeId(node.id);
    },
    [pan, zoom]
  );

  // ====== Delete Node ======
  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
      setConnections((prev) => prev.filter((c) => c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId));
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
    },
    [selectedNodeId]
  );

  // ====== Delete Connection ======
  const deleteConnection = useCallback((connId: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== connId));
  }, []);

  // ====== Update Node Data ======
  const updateNodeData = useCallback(
    (nodeId: string, key: string, value: string) => {
      setNodes((prev) =>
        prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, [key]: value } } : n))
      );
    },
    []
  );

  // ====== Filtered palette ======
  const filteredDefs = NODE_DEFS.filter(
    (d) =>
      d.label.toLowerCase().includes(paletteSearch.toLowerCase()) ||
      d.type.toLowerCase().includes(paletteSearch.toLowerCase())
  );

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedDef = selectedNode ? NODE_DEF_MAP[selectedNode.type] : null;

  return (
    <div className="flex h-full overflow-hidden">
      {/* ====== LEFT PALETTE ====== */}
      <div className="w-64 bg-discord-darker border-r border-[var(--rc-border)] flex flex-col shrink-0">
        <div className="p-3 border-b border-[var(--rc-border)]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-discord-muted" />
            <input
              value={paletteSearch}
              onChange={(e) => setPaletteSearch(e.target.value)}
              placeholder="Search nodes..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-md bg-discord-input border border-[var(--rc-border)] text-foreground placeholder:text-discord-muted focus:outline-none focus:border-discord-brand"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {NODE_CATEGORIES.map(({ key, label, color }) => {
            const items = filteredDefs.filter((d) => d.category === key);
            if (items.length === 0) return null;
            const collapsed = collapsedCategories.has(key);
            return (
              <div key={key}>
                <button
                  onClick={() =>
                    setCollapsedCategories((prev) => {
                      const s = new Set(prev);
                      if (collapsed) { s.delete(key); } else { s.add(key); }
                      return s;
                    })
                  }
                  className={`flex items-center gap-1.5 px-2 py-1.5 text-xs font-bold uppercase tracking-wider w-full ${color} hover:brightness-125`}
                >
                  {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {label}
                  <span className="text-discord-muted ml-auto font-normal">{items.length}</span>
                </button>
                {!collapsed &&
                  items.map((def) => (
                    <button
                      key={def.type}
                      onClick={() => addNode(def.type)}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-sm rounded-md hover:bg-discord-hover transition-colors text-left group"
                    >
                      <def.icon className="w-4 h-4 text-discord-muted group-hover:text-foreground shrink-0" />
                      <span className="truncate">{def.label}</span>
                    </button>
                  ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* ====== CENTER CANVAS ====== */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-hidden bg-discord-dark cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
      >
        {/* Grid pattern */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
          <defs>
            <pattern id="grid" width={20 * zoom} height={20 * zoom} patternUnits="userSpaceOnUse" x={pan.x % (20 * zoom)} y={pan.y % (20 * zoom)}>
              <circle cx={1} cy={1} r={0.8} fill="var(--rc-border)" />
            </pattern>
          </defs>
          <rect fill="url(#grid)" width="100%" height="100%" />
        </svg>

        {/* Connections SVG */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {connections.map((conn) => {
              const from = portPos(conn.sourceNodeId, conn.sourcePort, "output", canvasRef.current, pan, zoom);
              const to = portPos(conn.targetNodeId, conn.targetPort, "input", canvasRef.current, pan, zoom);
              if (!from || !to) return null;
              const dx = Math.abs(to.x - from.x) * 0.5;
              return (
                <g key={conn.id} className="pointer-events-auto cursor-pointer" onClick={() => deleteConnection(conn.id)}>
                  <path
                    d={`M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`}
                    stroke="transparent"
                    strokeWidth={12}
                    fill="none"
                  />
                  <path
                    d={`M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`}
                    stroke="#5865f2"
                    strokeWidth={2.5}
                    fill="none"
                    className="transition-colors hover:stroke-discord-red"
                  />
                </g>
              );
            })}
            {connecting && (() => {
              const from = portPos(connecting.nodeId, connecting.port, "output", canvasRef.current, pan, zoom);
              if (!from) return null;
              const dx = Math.abs(connectMouse.x - from.x) * 0.5;
              return (
                <path
                  d={`M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${connectMouse.x - dx} ${connectMouse.y}, ${connectMouse.x} ${connectMouse.y}`}
                  stroke="#5865f2"
                  strokeWidth={2}
                  fill="none"
                  strokeDasharray="6 3"
                  opacity={0.7}
                />
              );
            })()}
          </g>
        </svg>

        {/* Nodes */}
        <div className="absolute inset-0" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0", zIndex: 2 }}>
          {nodes.map((node) => {
            const def = NODE_DEF_MAP[node.type];
            if (!def) return null;
            const isSelected = node.id === selectedNodeId;
            return (
              <div
                key={node.id}
                className={`absolute select-none group ${isSelected ? "ring-2 ring-discord-brand ring-offset-1 ring-offset-transparent" : ""}`}
                style={{ left: node.position.x, top: node.position.y, width: 220 }}
              >
                <div className={`rounded-lg overflow-hidden shadow-lg border ${def.borderColor} border-opacity-40 bg-discord-channel`}>
                  {/* Header */}
                  <div
                    className={`${def.color} px-3 py-2 flex items-center gap-2 cursor-move`}
                    onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  >
                    <GripVertical className="w-3.5 h-3.5 text-white/60 shrink-0" />
                    <def.icon className="w-4 h-4 text-white shrink-0" />
                    <span className="text-xs font-semibold text-white truncate flex-1">{def.label}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/20 transition-all"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>

                  {/* Ports */}
                  <div className="px-3 py-2 space-y-1.5">
                    {def.inputs.map((p) => (
                      <div key={p} className="flex items-center gap-2 -ml-[18px]">
                        <div
                          data-port={`${node.id}__${p}__input`}
                          className="w-3 h-3 rounded-full border-2 border-discord-brand bg-discord-dark hover:bg-discord-brand transition-colors cursor-crosshair shrink-0"
                          onMouseUp={(e) => handlePortMouseUp(e, node.id, p, "input")}
                        />
                        <span className="text-[10px] text-discord-muted uppercase">{p}</span>
                      </div>
                    ))}
                    {/* Available variables from upstream */}
                    {(() => {
                      const vars = getAvailableVariables(node.id, nodes, connections);
                      if (vars.length === 0) return null;
                      return (
                        <div className="flex flex-wrap gap-0.5 mt-1 mb-1">
                          {vars.slice(0, 4).map((v) => (
                            <span key={v.name} className="text-[8px] px-1 py-0.5 rounded bg-violet-500/20 text-violet-300 font-mono truncate max-w-[90px]" title={v.description}>
                              {v.name}
                            </span>
                          ))}
                          {vars.length > 4 && (
                            <span className="text-[8px] px-1 py-0.5 rounded bg-violet-500/10 text-violet-400">+{vars.length - 4}</span>
                          )}
                        </div>
                      );
                    })()}
                    {/* Emits badges */}
                    {def.emits.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 mt-1">
                        {def.emits.slice(0, 3).map((v) => (
                          <span key={v.name} className="text-[8px] px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono truncate max-w-[90px]" title={`Emits: ${v.description}`}>
                            ↑{v.name}
                          </span>
                        ))}
                        {def.emits.length > 3 && (
                          <span className="text-[8px] px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-400">+{def.emits.length - 3}</span>
                        )}
                      </div>
                    )}
                    {def.outputs.map((p) => (
                      <div key={p} className="flex items-center gap-2 justify-end -mr-[18px]">
                        <span className="text-[10px] text-discord-muted uppercase">{p}</span>
                        <div
                          data-port={`${node.id}__${p}__output`}
                          className="w-3 h-3 rounded-full border-2 border-discord-brand bg-discord-dark hover:bg-discord-brand transition-colors cursor-crosshair shrink-0"
                          onMouseDown={(e) => handlePortMouseDown(e, node.id, p, "output")}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Zoom indicator */}
        <div className="absolute bottom-4 left-4 bg-discord-darker/80 backdrop-blur-sm text-xs text-discord-muted px-3 py-1.5 rounded-lg border border-[var(--rc-border)]" style={{ zIndex: 10 }}>
          {Math.round(zoom * 100)}% &middot; Alt+Drag to pan &middot; Scroll to zoom
        </div>
      </div>

      {/* ====== RIGHT PROPERTIES PANEL ====== */}
      <div className="w-72 bg-discord-darker border-l border-[var(--rc-border)] flex flex-col shrink-0">
        {selectedNode && selectedDef ? (
          <>
            <div className={`${selectedDef.color} px-4 py-3 flex items-center gap-2`}>
              <selectedDef.icon className="w-5 h-5 text-white" />
              <span className="text-sm font-bold text-white">{selectedDef.label}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Node ID */}
              <div>
                <label className="text-[10px] font-bold uppercase text-discord-muted tracking-wider">Node ID</label>
                <p className="text-xs text-foreground/60 font-mono mt-0.5 truncate">{selectedNode.id}</p>
              </div>

              {selectedDef.fields.length === 0 && (
                <p className="text-xs text-discord-muted italic">This node has no configurable fields.</p>
              )}

              {selectedDef.fields.map((field) => (
                <div key={field.key}>
                  <label className="text-[10px] font-bold uppercase text-discord-muted tracking-wider block mb-1">
                    {field.label}
                  </label>
                  {field.type === "textarea" ? (
                    <Textarea
                      value={(selectedNode.data[field.key] as string) || ""}
                      onChange={(e) => updateNodeData(selectedNode.id, field.key, e.target.value)}
                      placeholder={field.placeholder}
                      rows={3}
                      className="bg-discord-input border-[var(--rc-border)] resize-none text-sm"
                    />
                  ) : field.type === "select" ? (
                    <select
                      value={(selectedNode.data[field.key] as string) || field.options?.[0]?.value || ""}
                      onChange={(e) => updateNodeData(selectedNode.id, field.key, e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-md bg-discord-input border border-[var(--rc-border)] text-foreground focus:outline-none focus:border-discord-brand"
                    >
                      {field.options?.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      type={field.type}
                      value={(selectedNode.data[field.key] as string) || ""}
                      onChange={(e) => updateNodeData(selectedNode.id, field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="bg-discord-input border-[var(--rc-border)] text-sm"
                    />
                  )}
                </div>
              ))}

              {/* Available Variables from upstream */}
              {(() => {
                const availVars = getAvailableVariables(selectedNode.id, nodes, connections);
                if (availVars.length === 0) return null;
                return (
                  <div>
                    <label className="text-[10px] font-bold uppercase text-discord-muted tracking-wider flex items-center gap-1 mb-1.5">
                      <Zap className="w-3 h-3" />
                      Available Variables
                    </label>
                    <p className="text-[10px] text-discord-muted mb-2">Click to copy. Use as <span className="font-mono text-violet-400">{"{{name}}"}</span> in fields.</p>
                    <div className="flex flex-wrap gap-1">
                      {availVars.map((v) => (
                        <button
                          key={v.name}
                          onClick={() => navigator.clipboard.writeText(`{{${v.name}}}`)}
                          className="text-[11px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 transition-colors font-mono cursor-pointer"
                          title={`${v.description} — Click to copy {{${v.name}}}`}
                        >
                          {v.name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Emitted Variables */}
              {selectedDef.emits.length > 0 && (
                <div>
                  <label className="text-[10px] font-bold uppercase text-discord-muted tracking-wider flex items-center gap-1 mb-1.5">
                    <Zap className="w-3 h-3 text-emerald-400" />
                    Emits Variables
                  </label>
                  <p className="text-[10px] text-discord-muted mb-2">Downstream nodes can use these.</p>
                  <div className="space-y-1">
                    {selectedDef.emits.map((v) => (
                      <div key={v.name} className="flex items-center gap-2 text-xs">
                        <span className="font-mono text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded">{v.name}</span>
                        <span className="text-discord-muted text-[10px] truncate">{v.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Delete button */}
              <button
                onClick={() => deleteNode(selectedNode.id)}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-discord-red hover:bg-discord-red/10 rounded-md transition-colors mt-4"
              >
                <Trash2 className="w-4 h-4" />
                Delete Node
              </button>
            </div>

            {/* Connections for this node */}
            <div className="border-t border-[var(--rc-border)] p-3">
              <p className="text-[10px] font-bold uppercase text-discord-muted tracking-wider mb-2">Connections</p>
              {connections.filter((c) => c.sourceNodeId === selectedNode.id || c.targetNodeId === selectedNode.id).length === 0 ? (
                <p className="text-xs text-discord-muted italic">No connections</p>
              ) : (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {connections
                    .filter((c) => c.sourceNodeId === selectedNode.id || c.targetNodeId === selectedNode.id)
                    .map((c) => {
                      const otherNodeId = c.sourceNodeId === selectedNode.id ? c.targetNodeId : c.sourceNodeId;
                      const otherNode = nodes.find((n) => n.id === otherNodeId);
                      const otherDef = otherNode ? NODE_DEF_MAP[otherNode.type] : null;
                      return (
                        <div key={c.id} className="flex items-center gap-2 text-xs">
                          <span className="text-discord-muted">→</span>
                          <span className="text-foreground/80 truncate flex-1">{otherDef?.label || "?"}</span>
                          <button
                            onClick={() => deleteConnection(c.id)}
                            className="text-discord-muted hover:text-discord-red shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-discord-channel flex items-center justify-center mb-3">
              <Search className="w-8 h-8 text-discord-muted" />
            </div>
            <p className="text-sm font-medium text-discord-muted">Select a node to edit</p>
            <p className="text-xs text-discord-muted mt-1">Click a node on the canvas or add one from the palette</p>
          </div>
        )}
      </div>
    </div>
  );
}
