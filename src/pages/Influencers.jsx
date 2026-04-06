import { useState, useRef, useEffect } from 'react'
import { Store } from '../store'
import { supabase } from '../supabase'
import InfluencerModal from '../components/InfluencerModal'
import PlatformLogo from '../components/PlatformLogo'

// ── Three-dots menu ───────────────────────────────────────────────────────────
function DotsMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = e => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="inf4-dots-btn"
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 36, right: 0, zIndex: 100,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 10, boxShadow: 'var(--shadow-md)',
          padding: 4, minWidth: 130,
          animation: 'fadeIn 0.12s ease',
        }}>
          <button className="card-menu-item" onClick={() => { setOpen(false); onEdit() }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit
          </button>
          <div style={{ height: 1, background: 'var(--border)', margin: '3px 0' }} />
          <button className="card-menu-item danger" onClick={() => { setOpen(false); onDelete() }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
            </svg>
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────
function InfluencerCard({ inf, pipelineCount, onEdit, onDelete, onOpen }) {
  const image = inf.refImages?.[0]

  return (
    <div className="inf4-wrap">
      <div className="inf4-card" onClick={onOpen} style={{ background: inf.color }}>

        {image && (
          <img src={image} alt="" style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'top center',
            display: 'block',
          }} />
        )}

        {!image && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 72, fontWeight: 900, color: 'rgba(255,255,255,0.25)',
          }}>
            {inf.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, transparent 25%, rgba(0,0,0,0.85) 100%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'absolute', top: 12, right: 12 }} onClick={e => e.stopPropagation()}>
          <DotsMenu onEdit={onEdit} onDelete={onDelete} />
        </div>

        <div style={{ position: 'absolute', top: 12, left: 12 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 9px', borderRadius: 20,
            fontSize: 10, fontWeight: 700,
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.22)',
            color: 'white',
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: inf.status === 'active' ? '#4ade80' : inf.status === 'paused' ? '#fbbf24' : '#9ca3af',
              flexShrink: 0,
            }} />
            {inf.status}
          </span>
        </div>

        <div style={{
          position: 'absolute', bottom: 16, left: 16, right: 16,
          pointerEvents: 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'white', lineHeight: 1, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                {pipelineCount}
              </span>
              <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Pipelines
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'white', lineHeight: 1, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                {inf.postsGenerated || 0}
              </span>
              <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Posts
              </span>
            </div>

            {(inf.platforms || []).length > 0 && (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                {inf.platforms.map(p => <PlatformLogo key={p} platform={p} size={20} />)}
              </div>
            )}
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.2)', marginBottom: 10 }} />

          <div style={{
            fontSize: 18, fontWeight: 800, color: 'white', lineHeight: 1.2,
            textShadow: '0 1px 6px rgba(0,0,0,0.5)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {inf.name}
          </div>
          <div style={{
            fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 3,
            textShadow: '0 1px 3px rgba(0,0,0,0.4)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {inf.niche || 'No niche set'}
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Add card ──────────────────────────────────────────────────────────────────
function AddCard({ onClick }) {
  return (
    <div className="inf4-add-card" onClick={onClick}>
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: 'var(--surface2)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 8, transition: 'all 0.15s',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700 }}>New Influencer</div>
      <div style={{ fontSize: 12, marginTop: 3, color: 'var(--text-muted)' }}>Persona, pipelines &amp; style</div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Influencers({ onOpenDetail, onCountChange }) {
  const [influencers, setInfluencers]     = useState([])
  const [workflowCounts, setWorkflowCounts] = useState({})
  const [loading, setLoading]             = useState(true)
  const [modal, setModal]                 = useState(null)

  async function loadData() {
    const [infData, wfData] = await Promise.all([
      Store.getAll(),
      supabase.from('workflows').select('influencer_id'),
    ])
    setInfluencers(infData)
    onCountChange?.(infData.length)
    const counts = {}
    for (const { influencer_id } of wfData.data || []) {
      counts[influencer_id] = (counts[influencer_id] || 0) + 1
    }
    setWorkflowCounts(counts)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  function refresh() { loadData() }

  async function handleSave(data) {
    if (modal === 'create') await Store.create(data)
    else await Store.update(modal.id, data)
    refresh()
  }

  async function handleDelete(id) {
    const inf = influencers.find(i => i.id === id)
    if (!inf) return
    if (confirm(`Delete "${inf.name}"? This cannot be undone.`)) {
      await Store.delete(id)
      refresh()
    }
  }

  const count = influencers.length
  const sub = loading
    ? 'Loading...'
    : count === 0
      ? 'No influencers created yet'
      : `${count} influencer${count !== 1 ? 's' : ''} configured`

  return (
    <>
      <div className="section-header">
        <div>
          <div className="section-sub">{sub}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('create')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Influencer
        </button>
      </div>

      <div className="inf4-grid">
        {influencers.map(inf => (
          <InfluencerCard
            key={inf.id}
            inf={inf}
            pipelineCount={workflowCounts[inf.id] || 0}
            onEdit={() => setModal(inf)}
            onDelete={() => handleDelete(inf.id)}
            onOpen={() => onOpenDetail(inf.id)}
          />
        ))}
        <AddCard onClick={() => setModal('create')} />
      </div>

      {modal && (
        <InfluencerModal
          initial={modal === 'create' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}
