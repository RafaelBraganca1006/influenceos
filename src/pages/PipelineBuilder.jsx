import { useState, useEffect, useCallback, useRef, forwardRef } from 'react'
import {
  ReactFlow, addEdge, Background, BackgroundVariant, Controls, MiniMap,
  useNodesState, useEdgesState, MarkerType, useReactFlow, useViewport,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { supabase } from '../supabase'
import { nodeTypes, getDefaultNodeData } from '../components/workflow/NodeTypes'
import ConfigPanel from '../components/workflow/ConfigPanel'
import { executeWorkflow } from '../services/executor'

const NODE_PALETTE = [
  { type: 'trigger',   Icon: IconPlay,   label: 'Trigger',     color: '#5e5ce6', desc: 'Starting point' },
  { type: 'llm',       Icon: IconSpark,  label: 'LLM Call',    color: '#0071e3', desc: 'Gemini text gen' },
  { type: 'image_gen', Icon: IconImg,    label: 'Image Gen',   color: '#7c3aed', desc: 'Nano Banana'     },
  { type: 'sticky',    Icon: IconSticky, label: 'Sticky Note', color: '#ca8a04', desc: 'Annotation'      },
]

function IconPlay()   { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> }
function IconSpark()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="11" x2="21" y2="11"/><line x1="3" y1="16" x2="14" y2="16"/></svg> }
function IconImg()    { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> }
function IconSticky() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"/><polyline points="14 2 14 8 20 8"/><path d="M20 12v6a2 2 0 0 1-2 2h-2"/><line x1="12" y1="12" x2="12" y2="12"/></svg> }

// ── Captures screenToFlowPosition from inside ReactFlow provider ──────────────
const FlowProject = forwardRef((_, ref) => {
  const { screenToFlowPosition } = useReactFlow()
  ref.current = screenToFlowPosition
  return null
})

// ── Context menu item ─────────────────────────────────────────────────────────
function CtxMenuItem({ onClick, color, Icon, label }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        padding: '7px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
        background: hov ? '#f8fafc' : 'transparent',
        fontFamily: 'inherit', fontSize: 13, fontWeight: 500, color: '#1d1d1f',
        textAlign: 'left', transition: 'background 0.1s',
      }}
    >
      <div style={{
        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
        background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color,
      }}>
        <Icon />
      </div>
      {label}
    </button>
  )
}

const SNAP_THRESHOLD = 8 // flow-space pixels


// ── Snap alignment guides (must be inside ReactFlow provider) ─────────────────
function SnapOverlay({ guides }) {
  const { x: vpX, y: vpY, zoom } = useViewport()
  if (!guides.length) return null
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 999 }}>
      {guides.map((g, i) =>
        g.type === 'h'
          ? <div key={i} style={{
              position: 'absolute', left: 0, right: 0,
              top: Math.round(g.y * zoom + vpY),
              height: 1, background: '#0071e3',
              boxShadow: '0 0 6px rgba(0,113,227,0.5)',
            }} />
          : <div key={i} style={{
              position: 'absolute', top: 0, bottom: 0,
              left: Math.round(g.x * zoom + vpX),
              width: 1, background: '#0071e3',
              boxShadow: '0 0 6px rgba(0,113,227,0.5)',
            }} />
      )}
    </div>
  )
}

// ── Keyboard zoom (must be inside ReactFlow provider) ─────────────────────────
function KeyboardZoom() {
  const { zoomIn, zoomOut } = useReactFlow()
  useEffect(() => {
    const handler = e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === '+' || e.key === '=') zoomIn({ duration: 200 })
      if (e.key === '-')                  zoomOut({ duration: 200 })
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [zoomIn, zoomOut])
  return null
}

const EDGE_STYLE = {
  type: 'default',
  markerEnd: { type: MarkerType.ArrowClosed, color: '#0071e3' },
  style: { stroke: '#0071e3', strokeWidth: 1.5 },
}

export default function PipelineBuilder({ influencerId, workflowId, onBack }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [name, setName]         = useState('Untitled Workflow')
  const [selectedId, setSelectedId] = useState(null)
  const [running, setRunning]     = useState(false)
  const [runError, setRunError]   = useState(null)
  const [saving, setSaving]       = useState(false)
  const [dbId, setDbId]           = useState(workflowId || null)
  const [paletteOpen, setPalette] = useState(true)
  const [minimapOpen, setMinimap] = useState(true)
  const [ctxMenu, setCtxMenu]     = useState(null) // { x, y, flowX, flowY }
  const [renamingTitle, setRenamingTitle] = useState(false)
  const [snapGuides, setSnapGuides] = useState([])
  const canvasRef      = useRef(null)
  const flowProjectRef = useRef(null) // set by FlowProject inside <ReactFlow>

  // ── Load workflow ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (workflowId) {
      supabase.from('workflows').select('*').eq('id', workflowId).single()
        .then(({ data }) => {
          if (!data) return
          setName(data.name)
          setNodes(data.nodes || [])
          setEdges(data.edges || [])
        })
    } else {
      // Default: start with a trigger node
      setNodes([{
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 80, y: 200 },
        data: getDefaultNodeData('trigger'),
        zIndex: 1,
      }])
    }
  }, [workflowId])

  // ── Connections ──────────────────────────────────────────────────────────────
  const onConnect = useCallback(
    params => setEdges(es => addEdge({ ...params, ...EDGE_STYLE }, es)),
    [],
  )

  // ── Add node ─────────────────────────────────────────────────────────────────
  function addNode(type, position) {
    const id  = `${type}-${Date.now()}`
    const pos = position || { x: 120 + Math.random() * 200, y: 80 + Math.random() * 300 }
    const newNode = {
      id, type, position: pos,
      data: getDefaultNodeData(type),
      ...(type === 'sticky'
        ? { zIndex: 0, style: { width: 220, height: 160 } }
        : { zIndex: 1 }),
    }
    // Sticky notes prepend (render behind); regular nodes append (render in front)
    setNodes(nds => type === 'sticky' ? [newNode, ...nds] : [...nds, newNode])
    setSelectedId(id)
  }

  // ── Context menu ──────────────────────────────────────────────────────────────
  function handlePaneContextMenu(e) {
    e.preventDefault()
    const rect    = canvasRef.current?.getBoundingClientRect()
    const menuX   = rect ? e.clientX - rect.left : e.clientX
    const menuY   = rect ? e.clientY - rect.top  : e.clientY
    const flowPos = flowProjectRef.current?.({ x: e.clientX, y: e.clientY }) || { x: 200, y: 200 }
    setCtxMenu({ x: menuX, y: menuY, flowX: flowPos.x, flowY: flowPos.y })
  }

  function addFromMenu(type) {
    addNode(type, { x: ctxMenu.flowX, y: ctxMenu.flowY })
    setCtxMenu(null)
  }

  // ── Snap-to-alignment magnet ───────────────────────────────────────────────
  function handleNodeDrag(_, draggedNode) {
    const dw  = draggedNode.measured?.width  ?? 230
    const dh  = draggedNode.measured?.height ?? 60
    const dx  = draggedNode.position.x
    const dy  = draggedNode.position.y
    const dCX = dx + dw / 2
    const dCY = dy + dh / 2

    let snapX = null, snapY = null
    const guides = []

    for (const node of nodes) {
      if (node.id === draggedNode.id) continue
      const nw  = node.measured?.width  ?? 230
      const nh  = node.measured?.height ?? 60
      const nx  = node.position.x, ny = node.position.y
      const nCX = nx + nw / 2, nCY = ny + nh / 2

      if (snapY === null && Math.abs(dCY - nCY) < SNAP_THRESHOLD) {
        snapY = nCY - dh / 2
        guides.push({ type: 'h', y: nCY })
      }
      if (snapX === null && Math.abs(dCX - nCX) < SNAP_THRESHOLD) {
        snapX = nCX - dw / 2
        guides.push({ type: 'v', x: nCX })
      }
      if (snapY === null && Math.abs(dy - ny) < SNAP_THRESHOLD) {
        snapY = ny
        guides.push({ type: 'h', y: ny })
      }
      if (snapX === null && Math.abs(dx - nx) < SNAP_THRESHOLD) {
        snapX = nx
        guides.push({ type: 'v', x: nx })
      }
    }

    setSnapGuides(guides)

    if (snapX !== null || snapY !== null) {
      setNodes(nds => nds.map(n =>
        n.id === draggedNode.id
          ? { ...n, position: { x: snapX ?? dx, y: snapY ?? dy } }
          : n
      ))
    }
  }

  // ── Update selected node config ───────────────────────────────────────────────
  function updateNodeConfig(config, label) {
    setNodes(nds => nds.map(n =>
      n.id === selectedId
        ? { ...n, data: { ...n.data, config, label: label ?? n.data.label } }
        : n,
    ))
  }

  function updateNodeLabel(label) {
    setNodes(nds => nds.map(n =>
      n.id === selectedId ? { ...n, data: { ...n.data, label } } : n,
    ))
  }

  // ── Delete selected node ──────────────────────────────────────────────────────
  function deleteNode(id) {
    setNodes(nds => nds.filter(n => n.id !== id))
    setEdges(es  => es.filter(e => e.source !== id && e.target !== id))
    setSelectedId(null)
  }

  // ── Save ──────────────────────────────────────────────────────────────────────
  async function save() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      influencer_id: influencerId,
      user_id: user.id,
      name,
      nodes: nodes.map(n => ({ ...n, data: { ...n.data, result: undefined } })),
      edges,
      updated_at: new Date().toISOString(),
    }
    if (dbId) {
      await supabase.from('workflows').update(payload).eq('id', dbId)
    } else {
      const { data } = await supabase.from('workflows').insert(payload).select('id').single()
      if (data) setDbId(data.id)
    }
    setSaving(false)
  }

  // ── Run ───────────────────────────────────────────────────────────────────────
  async function run() {
    setRunning(true)
    setRunError(null)
    // Clear previous results
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, result: null } })))

    try {
      const { data: keyData } = await supabase.from('api_keys').select('gemini_key').single()
      await executeWorkflow(nodes, edges, { geminiKey: keyData?.gemini_key || '' }, (nodeId, result) => {
        setNodes(nds => nds.map(n =>
          n.id === nodeId ? { ...n, data: { ...n.data, result } } : n,
        ))
      })
    } catch (err) {
      setRunError(err.message)
    }
    setRunning(false)
  }

  const selectedNode = selectedId ? nodes.find(n => n.id === selectedId) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', height: '100%' }}>

      {/* ── Top bar ── */}
      <div style={{
        height: 54, background: 'white', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px',
        flexShrink: 0, zIndex: 10,
      }}>
        <button className="btn btn-secondary btn-sm" onClick={onBack} style={{ gap: 5 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>

        {/* ── Workflow name (click pencil or double-click to rename) ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, maxWidth: 320 }}
          onDoubleClick={() => setRenamingTitle(true)}>
          {renamingTitle ? (
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={() => setRenamingTitle(false)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setRenamingTitle(false) }}
              style={{
                flex: 1, background: 'white', border: '1.5px solid #0071e3', outline: 'none',
                borderRadius: 7, padding: '3px 8px',
                fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px',
                fontFamily: 'inherit',
              }}
            />
          ) : (
            <>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px', cursor: 'default' }}>
                {name || 'Untitled Workflow'}
              </span>
              <button
                onClick={() => setRenamingTitle(true)}
                title="Rename workflow"
                style={{
                  border: 'none', background: 'none', cursor: 'pointer', padding: 4, borderRadius: 5,
                  color: '#94a3b8', display: 'flex', alignItems: 'center',
                  transition: 'color 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#1d1d1f'}
                onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            </>
          )}
        </div>

        {runError && (
          <div style={{ fontSize: 12, color: 'var(--red)', maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            ⚠ {runError}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <button className="btn btn-secondary btn-sm" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={run} disabled={running} style={{ gap: 6 }}>
            {running
              ? <><span style={{ display:'inline-block', animation:'spin 1s linear infinite' }}>⟳</span> Running…</>
              : <><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Run</>
            }
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

        {/* ── Node Palette ── */}
        {paletteOpen && (
          <div style={{
            width: 180, background: 'var(--surface)', borderRight: '1px solid var(--border)',
            padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0,
          }}>
            <div className="nav-label" style={{ marginBottom: 6 }}>Add Node</div>
            {NODE_PALETTE.map(({ type, Icon, label, color, desc }) => (
              <button
                key={type}
                onClick={() => addNode(type)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                  border: '1px solid var(--border)', background: 'white',
                  display: 'flex', alignItems: 'center', gap: 10,
                  transition: 'border-color 0.12s, box-shadow 0.12s', textAlign: 'left',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 0 0 3px ${color}18` }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                  background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color,
                }}>
                  <Icon />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{desc}</div>
                </div>
              </button>
            ))}

            <div style={{ marginTop: 'auto', padding: '10px 0 0', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Use <code style={{ background: 'var(--surface2)', padding: '1px 4px', borderRadius: 4, fontSize: 10 }}>{'{{nodeId.output}}'}</code> in prompts to chain nodes.
              </div>
            </div>
          </div>
        )}

        {/* ── Canvas ── */}
        <div ref={canvasRef} style={{ flex: 1, position: 'relative', minWidth: 0, minHeight: 0 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => { setSelectedId(node.id); setCtxMenu(null) }}
            onPaneClick={() => { setSelectedId(null); setCtxMenu(null) }}
            onPaneContextMenu={handlePaneContextMenu}
            onNodeDrag={handleNodeDrag}
            onNodeDragStop={() => setSnapGuides([])}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.2}
            deleteKeyCode={null}
          >
            <KeyboardZoom />
            <FlowProject ref={flowProjectRef} />
            <SnapOverlay guides={snapGuides} />
            <Background variant={BackgroundVariant.Dots} color="#c8cdd6" gap={20} size={1.4} />
            <Controls style={{ bottom: 20, left: 20 }} />
            {minimapOpen && (
              <MiniMap
                nodeColor={n => n.type === 'trigger' ? '#6366f1' : n.type === 'llm' ? '#0071e3' : '#7c3aed'}
                style={{ bottom: 20, right: 20 }}
                maskColor="rgba(240,242,245,0.7)"
              />
            )}
          </ReactFlow>

          {/* ── Right-click context menu ── */}
          {ctxMenu && (
            <div
              style={{
                position: 'absolute', left: ctxMenu.x, top: ctxMenu.y, zIndex: 100,
                background: 'white', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)',
                boxShadow: '0 8px 28px rgba(0,0,0,0.14)', padding: 4, minWidth: 180,
                animation: 'fadeIn 0.1s ease',
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 10px 4px' }}>
                Add Node
              </div>
              {NODE_PALETTE.map(({ type, Icon, label, color }) => (
                <CtxMenuItem key={type} onClick={() => addFromMenu(type)} color={color} Icon={Icon} label={label} />
              ))}
            </div>
          )}

          {/* ── Palette toggle — tab anchored to left edge, vertically centered ── */}
          <button
            onClick={() => setPalette(o => !o)}
            title={paletteOpen ? 'Hide nodes panel' : 'Show nodes panel'}
            style={{
              position: 'absolute', top: '50%', left: 0, transform: 'translateY(-50%)',
              zIndex: 10, width: 20, height: 64,
              borderRadius: '0 10px 10px 0',
              border: '1px solid var(--border)', borderLeft: 'none',
              background: 'white', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '2px 0 8px rgba(0,0,0,0.08)',
              color: '#94a3b8', transition: 'background 0.12s, color 0.12s',
              padding: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#1d1d1f' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#94a3b8' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              {paletteOpen
                ? <polyline points="15 18 9 12 15 6"/>
                : <polyline points="9 18 15 12 9 6"/>}
            </svg>
          </button>

          {/* ── MiniMap toggle (bottom-right) ── */}
          <button
            onClick={() => setMinimap(o => !o)}
            title={minimapOpen ? 'Hide minimap' : 'Show minimap'}
            style={{
              position: 'absolute', bottom: 20, right: 20, zIndex: 10,
              width: 24, height: 24, borderRadius: 6, border: '1px solid var(--border)',
              background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)', color: 'var(--text-muted)',
              transition: 'background 0.12s',
              transform: minimapOpen ? 'translateY(-120px)' : 'none',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
            onMouseLeave={e => e.currentTarget.style.background = 'white'}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              {minimapOpen
                ? <><line x1="5" y1="12" x2="19" y2="12"/></>
                : <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>
              }
            </svg>
          </button>
        </div>

        {/* ── Config Panel ── */}
        {selectedNode && (
          <ConfigPanel
            node={selectedNode}
            onChange={(config, label) => {
              updateNodeConfig(config, label)
            }}
            onDelete={() => deleteNode(selectedNode.id)}
          />
        )}

      </div>
    </div>
  )
}
