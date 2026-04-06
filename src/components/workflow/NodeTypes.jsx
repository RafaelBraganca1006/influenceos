import { useState, useRef, useEffect } from 'react'
import { Handle, Position, useReactFlow, NodeResizer } from '@xyflow/react'

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const IconTrigger = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
)
const IconLLM = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6"  x2="21" y2="6"/>
    <line x1="3" y1="11" x2="21" y2="11"/>
    <line x1="3" y1="16" x2="14" y2="16"/>
  </svg>
)
const IconImage = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="3"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
)

const NODE_META = {
  trigger:   { label: 'Trigger',   Icon: IconTrigger },
  llm:       { label: 'LLM',       Icon: IconLLM     },
  image_gen: { label: 'Image Gen', Icon: IconImage   },
}

const COLOR_PALETTE = [
  '#5e5ce6','#0071e3','#7c3aed','#0891b2',
  '#16a34a','#f97316','#dc2626','#ec4899','#64748b',
]

// ── Hover Toolbar ─────────────────────────────────────────────────────────────
function NodeToolbar({ id, color, label, onColorChange, onActiveChange }) {
  const { deleteElements, setNodes } = useReactFlow()
  const [menuOpen,    setMenuOpen]    = useState(false)
  const [showColors,  setShowColors]  = useState(false)
  const [renaming,    setRenaming]    = useState(false)
  const [nameVal,     setNameVal]     = useState(label)
  const menuRef = useRef(null)

  useEffect(() => {
    onActiveChange?.(menuOpen || showColors || renaming)
  }, [menuOpen, showColors, renaming])

  useEffect(() => {
    if (!menuOpen) return
    const h = e => { if (!menuRef.current?.contains(e.target)) { setMenuOpen(false); setShowColors(false) } }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [menuOpen])

  function doDelete()     { deleteElements({ nodes: [{ id }] }) }
  function commitRename() {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, label: nameVal } } : n))
    setRenaming(false)
  }
  function pickColor(c)   { onColorChange(c); setShowColors(false); setMenuOpen(false) }

  return (
    // pill container — stays visible while mouse is anywhere inside paddingBottom bridge
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 1 }}
      onMouseDown={e => e.stopPropagation()}
    >
      {renaming ? (
        <input
          autoFocus
          value={nameVal}
          onChange={e => setNameVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(false) }}
          onBlur={commitRename}
          style={{
            fontSize: 12, padding: '4px 10px', borderRadius: 8,
            border: '1.5px solid #0071e3', outline: 'none',
            background: 'white', fontFamily: 'inherit', width: 150,
            boxShadow: '0 4px 12px rgba(0,0,0,0.14)',
          }}
        />
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 1,
          background: 'white', borderRadius: 9,
          border: '1px solid rgba(0,0,0,0.1)',
          boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
          padding: '3px 4px',
          animation: 'fadeIn 0.1s ease',
        }}>
          {/* Delete */}
          <PillBtn onClick={doDelete} title="Delete" hoverBg="#fef2f2" hoverColor="#dc2626">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
            </svg>
          </PillBtn>

          <div style={{ width: 1, height: 16, background: '#e2e8f0' }} />

          {/* Three dots */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <PillBtn onClick={() => { setMenuOpen(o => !o); setShowColors(false) }} title="More options">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
              </svg>
            </PillBtn>

            {menuOpen && (
              <div style={{
                position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)',
                zIndex: 200, background: 'white',
                border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.14)', padding: 4, minWidth: 160,
                animation: 'fadeIn 0.1s ease',
              }}>
                {!showColors ? (
                  <>
                    <MenuBtn onClick={() => { setRenaming(true); setNameVal(label); setMenuOpen(false) }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Rename
                    </MenuBtn>
                    <MenuBtn onClick={() => setShowColors(true)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/><path d="M12 20c-4.4 0-8-3.6-8-8 0-1.6.5-3.1 1.3-4.3C7 6.3 9.3 5 12 5c4.4 0 8 3.6 8 8s-3.6 7-8 7z"/></svg>
                      Change Color
                    </MenuBtn>
                    <div style={{ height: 1, background: '#f1f5f9', margin: '3px 0' }} />
                    <MenuBtn onClick={doDelete} danger>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                      Delete
                    </MenuBtn>
                  </>
                ) : (
                  <div style={{ padding: '8px 10px' }}>
                    <div style={{ fontSize: 11, color: '#8e8e93', fontWeight: 600, marginBottom: 8 }}>Node color</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {COLOR_PALETTE.map(c => (
                        <button key={c} onClick={() => pickColor(c)} style={{
                          width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer', padding: 0,
                          border: c === color ? '2.5px solid #1d1d1f' : '2px solid transparent',
                          transition: 'transform 0.1s',
                        }}
                          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function PillBtn({ onClick, title, children, hoverBg = '#f1f5f9', hoverColor = '#1d1d1f' }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick} title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
        background: hov ? hoverBg : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: hov ? hoverColor : '#94a3b8',
        transition: 'background 0.1s, color 0.1s',
      }}
    >
      {children}
    </button>
  )
}

function MenuBtn({ onClick, children, danger }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
        padding: '7px 10px', borderRadius: 7, background: hov ? (danger ? '#fef2f2' : '#f8fafc') : 'transparent',
        border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        fontSize: 12, fontWeight: 500, color: danger ? '#dc2626' : '#1d1d1f',
        textAlign: 'left', transition: 'background 0.1s',
      }}
    >
      {children}
    </button>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ result }) {
  if (!result) return null
  const map = {
    running: { bg: '#fff7ed', color: '#c2410c', label: 'Running' },
    success: { bg: '#f0fdf4', color: '#15803d', label: 'Done'    },
    error:   { bg: '#fef2f2', color: '#dc2626', label: null      },
  }
  const s = map[result.status]
  if (!s) return null
  return (
    <div style={{ margin: '0 12px 10px', padding: '4px 10px', background: s.bg, borderRadius: 6, fontSize: 11, color: s.color, fontWeight: 500 }}>
      {result.status === 'error' ? result.error : s.label}
    </div>
  )
}

// ── Result preview ────────────────────────────────────────────────────────────
function ResultPreview({ result }) {
  if (!result || result.status !== 'success') return null
  if (result.type === 'image') return (
    <div style={{ margin: '0 12px 10px' }}>
      <img src={result.output} alt="output" style={{ width: '100%', borderRadius: 8, display: 'block', maxHeight: 130, objectFit: 'cover' }} />
    </div>
  )
  if (result.output) return (
    <div style={{ margin: '0 12px 10px', padding: '8px 10px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11, color: '#475569', lineHeight: 1.6 }}>
      {result.output.slice(0, 140)}{result.output.length > 140 ? '…' : ''}
    </div>
  )
  return null
}

// ── Node shell ────────────────────────────────────────────────────────────────
function NodeShell({ id, type, selected, dragging, color, label, children, hasInput = true, hasOutput = true }) {
  const [hovered,   setHovered]   = useState(false)
  const [forceShow, setForceShow] = useState(false)
  const leaveTimer = useRef(null)
  const { setNodes } = useReactFlow()

  function onColorChange(c) {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, color: c } } : n))
  }

  function handleMouseEnter() {
    clearTimeout(leaveTimer.current)
    setHovered(true)
  }

  function handleMouseLeave() {
    leaveTimer.current = setTimeout(() => setHovered(false), 150)
  }

  return (
    <div
      style={{ position: 'relative', minWidth: 230 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        border: `1px solid ${selected ? color : 'rgba(0,0,0,0.09)'}`,
        boxShadow: selected
          ? `0 0 0 3px ${color}22, 0 4px 24px rgba(0,0,0,0.10)`
          : '0 2px 8px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        position: 'relative',
      }}>
        {/* Left stripe */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
          background: color, borderRadius: '12px 0 0 12px',
        }} />

        {hasInput && (
          <Handle type="target" position={Position.Left}
            style={{ width: 10, height: 10, background: '#94a3b8', border: '2.5px solid white', left: -5 }}
          />
        )}

        {children}

        {hasOutput && (
          <Handle type="source" position={Position.Right}
            style={{ width: 10, height: 10, background: color, border: '2.5px solid white', right: -5 }}
          />
        )}
      </div>

      {/* Toolbar — centered below card, hidden while dragging */}
      {(hovered || forceShow) && !dragging && (
        <div
          style={{ position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', zIndex: 50 }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <NodeToolbar id={id} type={type} color={color} label={label} onColorChange={onColorChange} onActiveChange={setForceShow} />
        </div>
      )}
    </div>
  )
}

// ── Node header ───────────────────────────────────────────────────────────────
function NodeHeader({ type, label, color, result }) {
  const { label: typeLabel, Icon } = NODE_META[type] || {}
  const dotColors = { running: '#f59e0b', success: '#22c55e', error: '#ef4444' }
  return (
    <div style={{ padding: '12px 14px 10px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
        background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', color,
      }}>
        {Icon && <Icon />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.1px' }}>
          {label}
        </div>
        <div style={{ fontSize: 10, color: '#8e8e93', fontWeight: 500, marginTop: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {typeLabel}
        </div>
      </div>
      {result && (
        <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: dotColors[result.status] || '#d1d5db' }} />
      )}
    </div>
  )
}

function PromptPreview({ text }) {
  if (!text?.trim()) return null
  return (
    <div style={{ margin: '0 12px 10px 18px', fontSize: 11, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' }}>
      "{text.slice(0, 90)}{text.length > 90 ? '…' : ''}"
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: '#f1f5f9', margin: '0 0 0 0' }} />
}

// ── TRIGGER NODE ──────────────────────────────────────────────────────────────
export function TriggerNode({ id, data, selected, dragging }) {
  const color = data.color || '#5e5ce6'
  return (
    <NodeShell id={id} type="trigger" selected={selected} dragging={dragging} color={color} label={data.label || 'Start'} hasInput={false}>
      <NodeHeader type="trigger" label={data.label || 'Start'} color={color} result={data.result} />
      {data.config?.input && <><Divider /><PromptPreview text={data.config.input} /></>}
      <StatusBadge result={data.result} />
      <ResultPreview result={data.result} />
    </NodeShell>
  )
}

// ── LLM NODE ─────────────────────────────────────────────────────────────────
export function LLMNode({ id, data, selected, dragging }) {
  const color = data.color || '#0071e3'
  const shortModel = (data.config?.model || 'gemini-2.0-flash').replace('gemini-', '').replace('-exp','')
  return (
    <NodeShell id={id} type="llm" selected={selected} dragging={dragging} color={color} label={data.label || 'LLM Call'}>
      <NodeHeader type="llm" label={data.label || 'LLM Call'} color={color} result={data.result} />
      <div style={{ padding: '0 14px 8px 18px' }}>
        <span style={{ fontSize: 10, background: '#f1f5f9', color: '#64748b', padding: '2px 7px', borderRadius: 4, fontWeight: 500 }}>{shortModel}</span>
      </div>
      {data.config?.prompt && <><Divider /><PromptPreview text={data.config.prompt} /></>}
      <StatusBadge result={data.result} />
      <ResultPreview result={data.result} />
    </NodeShell>
  )
}

// ── IMAGE GEN NODE ────────────────────────────────────────────────────────────
export function ImageGenNode({ id, data, selected, dragging }) {
  const color = data.color || '#7c3aed'
  const ar = data.config?.aspectRatio || '9:16'
  return (
    <NodeShell id={id} type="image_gen" selected={selected} dragging={dragging} color={color} label={data.label || 'Image Gen'}>
      <NodeHeader type="image_gen" label={data.label || 'Image Gen'} color={color} result={data.result} />
      <div style={{ padding: '0 14px 8px 18px', display: 'flex', gap: 5 }}>
        <span style={{ fontSize: 10, background: '#f1f5f9', color: '#64748b', padding: '2px 7px', borderRadius: 4, fontWeight: 500 }}>Nano Banana</span>
        <span style={{ fontSize: 10, background: '#f1f5f9', color: '#64748b', padding: '2px 7px', borderRadius: 4, fontWeight: 500 }}>{ar}</span>
      </div>
      {data.config?.prompt && <><Divider /><PromptPreview text={data.config.prompt} /></>}
      <StatusBadge result={data.result} />
      <ResultPreview result={data.result} />
    </NodeShell>
  )
}

const STICKY_COLORS = ['#fef9c3','#d1fae5','#dbeafe','#fce7f3','#ede9fe','#ffedd5','#f1f5f9','#fef2f2']

// ── STICKY NOTE NODE ──────────────────────────────────────────────────────────
export function StickyNode({ id, data, selected }) {
  const { setNodes, deleteElements } = useReactFlow()
  const bg = data.color || '#fef9c3'
  const [text, setText]           = useState(data.config?.text || '')
  const [showColors, setShowColors] = useState(false)

  function handleChange(e) {
    const val = e.target.value
    setText(val)
    setNodes(nds => nds.map(n =>
      n.id === id ? { ...n, data: { ...n.data, config: { ...n.data.config, text: val } } } : n
    ))
  }

  function pickColor(c) {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, color: c } } : n))
    setShowColors(false)
  }

  // Derive a darker shade for text from bg
  const isDark = ['#1d1d1f'].includes(bg)
  const textColor = isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.65)'
  const labelColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)'

  return (
    <div style={{
      background: bg,
      borderRadius: 10,
      border: 'none',
      boxShadow: selected
        ? '0 0 0 2px rgba(0,0,0,0.25), 0 4px 20px rgba(0,0,0,0.12)'
        : '0 2px 10px rgba(0,0,0,0.08)',
      padding: '10px 12px',
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      boxSizing: 'border-box',
      position: 'relative',
    }}>
      <NodeResizer
        minWidth={150} minHeight={100}
        isVisible={selected}
        lineStyle={{ borderColor: 'rgba(0,0,0,0.2)' }}
        handleStyle={{ borderColor: 'rgba(0,0,0,0.2)', background: 'white' }}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Note
        </span>
        <div style={{ display: 'flex', gap: 2 }} className="nodrag">
          {/* Color picker toggle */}
          <button
            onClick={() => setShowColors(s => !s)}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, borderRadius: 4, display: 'flex', opacity: 0.5, transition: 'opacity 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
            title="Change color"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill={bg === '#fef9c3' ? '#ca8a04' : 'currentColor'} stroke="none">
              <circle cx="7" cy="8" r="3"/><circle cx="17" cy="8" r="3"/><circle cx="7" cy="16" r="3"/><circle cx="17" cy="16" r="3"/>
            </svg>
          </button>
          {/* Delete */}
          <button
            onClick={() => deleteElements({ nodes: [{ id }] })}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, borderRadius: 4, display: 'flex', opacity: 0.5, transition: 'opacity 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Color palette */}
      {showColors && (
        <div className="nodrag" style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
          {STICKY_COLORS.map(c => (
            <button key={c} onClick={() => pickColor(c)} style={{
              width: 18, height: 18, borderRadius: '50%', background: c, border: c === bg ? '2px solid rgba(0,0,0,0.4)' : '1.5px solid rgba(0,0,0,0.12)',
              cursor: 'pointer', padding: 0, transition: 'transform 0.1s',
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            />
          ))}
        </div>
      )}

      <textarea
        value={text}
        onChange={handleChange}
        placeholder="Type your note…"
        className="nodrag nopan"
        style={{
          flex: 1, background: 'transparent', border: 'none', outline: 'none',
          resize: 'none', fontFamily: 'inherit', fontSize: 13, color: textColor,
          lineHeight: 1.6, padding: 0,
        }}
      />
    </div>
  )
}

export const nodeTypes = {
  trigger:   TriggerNode,
  llm:       LLMNode,
  image_gen: ImageGenNode,
  sticky:    StickyNode,
}

export function getDefaultNodeData(type) {
  if (type === 'trigger')   return { label: 'Start',     color: '#5e5ce6', config: { input: '' } }
  if (type === 'llm')       return { label: 'LLM Call',  color: '#0071e3', config: { model: 'gemini-2.0-flash', systemPrompt: '', prompt: '' } }
  if (type === 'image_gen') return { label: 'Image Gen', color: '#7c3aed', config: { model: 'gemini-2.0-flash-preview-image-generation', prompt: '', aspectRatio: '9:16' } }
  if (type === 'sticky')    return { label: 'Note',      color: '#fef9c3', config: { text: '' } }
  return { label: type, color: '#64748b', config: {} }
}
