import { useState, useEffect, useRef } from 'react'
import PlatformLogo from './PlatformLogo'
import { Store } from '../store'

const AUTO_COLORS = ['#EA580C','#2563EB','#7C3AED','#DC2626','#D97706','#0891B2','#BE185D','#15803D']

function autoColor(name) {
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  return AUTO_COLORS[Math.abs(hash) % AUTO_COLORS.length]
}

const PLAT_INFO = {
  ig: { label: 'Instagram', activeBg: '#fff0f5', activeBorder: '#e1306c' },
  tt: { label: 'TikTok',    activeBg: '#f5f5f5', activeBorder: '#555'    },
  yt: { label: 'YouTube',   activeBg: '#fff5f5', activeBorder: '#FF0000' },
}

// ── Card preview ──────────────────────────────────────────────────────────────
function CardPreview({ name, niche, status, platforms, image, color }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <div style={{
      width: 200, borderRadius: 14, overflow: 'hidden',
      border: '1px solid var(--border)', background: 'var(--surface)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)', flexShrink: 0,
    }}>
      {/* Banner */}
      <div style={{ height: 60, background: color, position: 'relative', overflow: 'hidden' }}>
        {image && <img src={image} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', opacity:.4 }} />}
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,transparent 40%,rgba(0,0,0,.18))' }} />
      </div>
      {/* Avatar */}
      <div style={{ padding:'0 14px', marginTop:-20, position:'relative', zIndex:1 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '3px solid var(--surface)', background: color, overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800, color: 'white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.14)',
        }}>
          {image
            ? <img src={image} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : initials
          }
        </div>
      </div>
      {/* Info */}
      <div style={{ padding: '6px 14px 14px' }}>
        <div style={{ fontSize:13, fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {name || <span style={{ color:'var(--text-muted)' }}>Influencer name</span>}
        </div>
        <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {niche || <span>Niche / Category</span>}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:8 }}>
          {status && <span className={`badge ${status}`} style={{ fontSize:10 }}>{status}</span>}
          <div style={{ display:'flex', gap:3, marginLeft:'auto' }}>
            {platforms.map(p => <PlatformLogo key={p} platform={p} size={16} />)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Field wrapper with error ───────────────────────────────────────────────────
function Field({ label, error, children }) {
  return (
    <div className="form-group">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
        <label className="form-label" style={{ margin:0 }}>{label} *</label>
        {error && <span style={{ fontSize:11, color:'var(--red)', fontWeight:500 }}>{error}</span>}
      </div>
      {children}
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function InfluencerModal({ initial, onSave, onClose }) {
  const isEdit = Boolean(initial)
  const [name, setName]         = useState(initial?.name || '')
  const [niche, setNiche]       = useState(initial?.niche || '')
  const [status, setStatus]     = useState(initial?.status || 'active')
  const [platforms, setPlatforms] = useState(initial?.platforms || [])
  const [image, setImage]       = useState(initial?.refImages?.[0] || null)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors]     = useState({})
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef(null)

  const color = autoColor(name || 'default')


  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function togglePlatform(p) {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
    setErrors(e => ({ ...e, platforms: null }))
  }

  async function handleFileUpload(file) {
    if (!file || !file.type.startsWith('image/')) return
    setUploading(true)
    try {
      const b64 = await Store.resizeToBase64(file)
      setImage(b64)
      setErrors(e => ({ ...e, image: null }))
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleFileUpload(file)
  }

  function validate() {
    const errs = {}
    if (!name.trim())        errs.name      = 'Required'
    if (!niche.trim())       errs.niche     = 'Required'
    if (!platforms.length)   errs.platforms = 'Select at least one'
    if (!image)              errs.image     = 'Required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSave() {
    if (!validate()) return
    onSave({
      name: name.trim(),
      niche: niche.trim(),
      status,
      color,
      platforms,
      refImages: image ? [image] : [],
    })
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 600, maxWidth: '95vw' }}>

        {/* Header */}
        <div style={{ padding:'24px 26px 0', display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:18, fontWeight:800, letterSpacing:'-0.3px' }}>
              {isEdit ? 'Edit Influencer' : 'New Influencer'}
            </div>
            <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:3 }}>
              All fields are required
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding:'20px 26px', display:'flex', gap:22, alignItems:'flex-start' }}>

          {/* Live preview */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
            <CardPreview name={name} niche={niche} color={color} status={status} platforms={platforms} image={image} />
            <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:500 }}>Preview</span>
          </div>

          {/* Form */}
          <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:14 }}>

            <Field label="Name" error={errors.name}>
              <input
                autoFocus
                className={`form-input ${errors.name ? 'error' : ''}`}
                value={name}
                onChange={e => { setName(e.target.value); setErrors(err => ({ ...err, name: null })) }}
                placeholder="e.g. Luna Voss"
              />
            </Field>

            <Field label="Niche / Category" error={errors.niche}>
              <input
                className={`form-input ${errors.niche ? 'error' : ''}`}
                value={niche}
                onChange={e => { setNiche(e.target.value); setErrors(err => ({ ...err, niche: null })) }}
                placeholder="e.g. Aesthetic Lifestyle"
              />
            </Field>

            <div className="form-group">
              <label className="form-label">Status *</label>
              <select className="form-select" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            {/* Platforms */}
            <Field label="Platforms" error={errors.platforms}>
              <div style={{ display:'flex', gap:8, marginTop:2 }}>
                {Object.entries(PLAT_INFO).map(([id, info]) => {
                  const active = platforms.includes(id)
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => togglePlatform(id)}
                      style={{
                        flex:1, padding:'9px 0', borderRadius:9, cursor:'pointer',
                        border: active ? `2px solid ${info.activeBorder}` : errors.platforms ? '2px solid var(--red)' : '2px solid var(--border)',
                        background: active ? info.activeBg : 'var(--surface2)',
                        display:'flex', flexDirection:'column', alignItems:'center', gap:5,
                        transition:'all 0.13s',
                      }}
                    >
                      <PlatformLogo platform={id} size={24} />
                      <span style={{ fontSize:11, fontWeight:600, color: active ? 'var(--text)' : 'var(--text-muted)' }}>
                        {info.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </Field>

            {/* Reference image */}
            <Field label="Reference Image" error={errors.image}>
              {image ? (
                <div style={{ position:'relative', display:'inline-block' }}>
                  <img
                    src={image}
                    alt="reference"
                    style={{ width:'100%', height:90, objectFit:'cover', borderRadius:9, display:'block', border:'1.5px solid var(--border)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setImage(null)}
                    style={{
                      position:'absolute', top:6, right:6,
                      background:'rgba(0,0,0,0.6)', color:'white',
                      border:'none', borderRadius:'50%',
                      width:22, height:22, cursor:'pointer',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:11, lineHeight:1,
                    }}
                  >✕</button>
                </div>
              ) : (
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  style={{
                    height: 80, borderRadius: 9, cursor: 'pointer',
                    border: `2px dashed ${errors.image ? 'var(--red)' : dragOver ? 'var(--accent)' : 'var(--border)'}`,
                    background: dragOver ? 'var(--accent-bg)' : 'var(--surface2)',
                    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                    gap:6, transition:'all 0.13s',
                    color: dragOver ? 'var(--accent)' : 'var(--text-muted)',
                  }}
                >
                  {uploading ? (
                    <span style={{ fontSize:12 }}>Uploading...</span>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <rect x="3" y="3" width="18" height="18" rx="3"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                      <span style={{ fontSize:12, fontWeight:500 }}>Click or drag to upload</span>
                    </>
                  )}
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display:'none' }}
                onChange={e => handleFileUpload(e.target.files[0])}
              />
            </Field>

          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding:'14px 26px 22px', display:'flex',
          justifyContent:'flex-end', gap:10,
          borderTop:'1px solid var(--border)',
        }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {isEdit ? 'Save Changes' : 'Create Influencer'}
          </button>
        </div>

      </div>
    </div>
  )
}
