import { useState, useEffect } from 'react'
import { Store } from '../store'
import { supabase } from '../supabase'
import { fetchInstagramData } from '../services/instagram'

const LS_KEY = 'rapidapi_key'

function proxyImg(url) {
  if (!url) return url
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}`
}

function fmt(n) {
  if (n == null) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

function calcER(profile, media) {
  if (!profile.followers_count || !media.length) return 0
  const avgLikes    = media.reduce((s, p) => s + (p.like_count || 0), 0) / media.length
  const avgComments = media.reduce((s, p) => s + (p.comments_count || 0), 0) / media.length
  return ((avgLikes + avgComments) / profile.followers_count) * 100
}

// ── Donut ─────────────────────────────────────────────────────────────────────
function renderDonutSegments(influencers) {
  const total    = influencers.length || 1
  const active   = influencers.filter(i => i.status === 'active').length
  const paused   = influencers.filter(i => i.status === 'paused').length
  const draft    = influencers.length - active - paused
  const segments = [
    { val: active, color: '#0055b3' },
    { val: paused, color: '#3395f5' },
    { val: draft,  color: '#a8d4ff' },
  ]
  const r = 15.9155, circ = 100
  let offset = 25
  return segments.map((s, i) => {
    const pct = (s.val / total) * circ
    const el = (
      <circle key={i} cx="18" cy="18" r={r}
        fill="none" stroke={s.color} strokeWidth="3.5"
        strokeDasharray={`${pct} ${circ - pct}`}
        strokeDashoffset={100 - offset} strokeLinecap="round"
      />
    )
    offset -= pct
    return el
  })
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ values, color = 'var(--accent)', width = 220, height = 36 }) {
  if (!values || values.length < 2) return null
  const max = Math.max(...values, 1)
  const pad = 2
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2)
    const y = pad + (1 - v / max) * (height - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible' }}>
      <polyline fill="none" stroke={color} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" points={pts}
      />
    </svg>
  )
}

// ── IG Summary Row ────────────────────────────────────────────────────────────
function IgSummaryRow({ igInfluencers, igData }) {
  const loaded = igInfluencers.filter(inf => igData[inf.id]?.profile)
  if (!loaded.length) return null

  const totalReach = loaded.reduce((s, inf) => s + (igData[inf.id].profile.followers_count || 0), 0)

  const best = loaded.reduce((acc, inf) => {
    const er = calcER(igData[inf.id].profile, igData[inf.id].media)
    return er > acc.er ? { er, name: inf.name } : acc
  }, { er: 0, name: '—' })

  const topPost = loaded.flatMap(inf =>
    igData[inf.id].media.map(p => ({ ...p, infName: inf.name }))
  ).reduce((b, p) => (p.like_count > b.like_count ? p : b), { like_count: 0, infName: '—' })

  const items = [
    {
      label: 'Total Reach',
      value: fmt(totalReach),
      sub: `${loaded.length} account${loaded.length !== 1 ? 's' : ''}`,
      color: 'var(--accent)',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    },
    {
      label: 'Best Engagement',
      value: best.er.toFixed(2) + '%',
      sub: best.name,
      color: '#16a34a',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
          <polyline points="17 6 23 6 23 12"/>
        </svg>
      ),
    },
    {
      label: 'Top Post',
      value: fmt(topPost.like_count) + ' likes',
      sub: topPost.infName,
      color: '#d97706',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ),
    },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
      {items.map(({ label, value, sub, color, icon }) => (
        <div key={label} style={{
          background: 'var(--surface2)', borderRadius: 12, padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: color + '1a', color, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {icon}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── IG Comparison Chart ───────────────────────────────────────────────────────
function IgComparisonChart({ igInfluencers, igData }) {
  const loaded = igInfluencers.filter(inf => igData[inf.id]?.profile)
  if (loaded.length < 2) return null

  const maxFollowers = Math.max(...loaded.map(inf => igData[inf.id].profile.followers_count), 1)

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Audience Comparison
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loaded.map(inf => {
          const d   = igData[inf.id]
          const pct = (d.profile.followers_count / maxFollowers) * 100
          const er  = calcER(d.profile, d.media)
          const erColor = er >= 3 ? '#16a34a' : er >= 1 ? '#d97706' : '#dc2626'

          return (
            <div key={inf.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 100, fontSize: 12, fontWeight: 600, color: 'var(--text)', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {inf.name}
              </div>
              <div style={{ flex: 1, height: 10, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: pct + '%',
                  background: inf.color || 'var(--accent)',
                  borderRadius: 99, transition: 'width 0.6s ease',
                }} />
              </div>
              <div style={{ width: 56, fontSize: 12, fontWeight: 700, color: 'var(--text)', textAlign: 'right', flexShrink: 0 }}>
                {fmt(d.profile.followers_count)}
              </div>
              <div style={{ width: 52, fontSize: 11, fontWeight: 700, color: erColor, textAlign: 'right', flexShrink: 0 }}>
                {er.toFixed(1)}% ER
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Post Thumbnail ────────────────────────────────────────────────────────────
function PostThumbnail({ post, isTop }) {
  const [hover, setHover] = useState(false)
  const src = proxyImg(post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url)

  return (
    <div
      style={{
        position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden',
        background: 'var(--surface2)', cursor: 'pointer',
        boxShadow: isTop ? '0 0 0 2px #d97706' : 'none',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {src
        ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : <div style={{ width: '100%', height: '100%', background: 'var(--surface2)' }} />
      }

      {isTop && (
        <div style={{
          position: 'absolute', top: 5, left: 5,
          background: '#d97706', borderRadius: 4,
          padding: '2px 5px', fontSize: 9, fontWeight: 800,
          color: 'white', letterSpacing: '0.04em',
        }}>
          TOP
        </div>
      )}

      {post.media_type === 'VIDEO' && (
        <div style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.5)', borderRadius: 4, padding: '2px 5px' }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </div>
      )}

      {hover && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          borderRadius: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'white', fontSize: 11, fontWeight: 700 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            {fmt(post.like_count)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'white', fontSize: 11, fontWeight: 700 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            {fmt(post.comments_count)}
          </div>
        </div>
      )}
    </div>
  )
}

// ── IG Influencer Card ────────────────────────────────────────────────────────
function StatPill({ label, value, color = 'var(--accent)' }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: 'var(--surface2)', borderRadius: 10, padding: '10px 16px', minWidth: 72,
    }}>
      <span style={{ fontSize: 16, fontWeight: 800, color, lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
    </div>
  )
}

function IgInfluencerCard({ inf, igData }) {
  const { profile, media } = igData

  const avgLikes    = media.length ? media.reduce((s, p) => s + (p.like_count || 0), 0) / media.length : 0
  const avgComments = media.length ? media.reduce((s, p) => s + (p.comments_count || 0), 0) / media.length : 0
  const er          = calcER(profile, media)
  const erStr       = profile.followers_count > 0 ? er.toFixed(2) + '%' : '—'

  const topPostId   = media.length ? media.reduce((b, p) => p.like_count > b.like_count ? p : b, media[0]).id : null
  const photoCount  = media.filter(p => p.media_type === 'IMAGE').length
  const videoCount  = media.filter(p => p.media_type === 'VIDEO').length

  // Sparkline: reverse to oldest→newest, likes trend
  const sparkValues = [...media].reverse().map(p => p.like_count)

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, marginTop: 4 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="avatar" style={{ background: inf.color, width: 42, height: 42, fontSize: 16, flexShrink: 0 }}>
            {profile.profile_pic_url
              ? <img src={proxyImg(profile.profile_pic_url)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} alt="" />
              : inf.refImages?.[0]
                ? <img src={inf.refImages[0]} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} alt="" />
                : inf.name[0].toUpperCase()
            }
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 5 }}>
              {inf.name}
              {profile.is_verified && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#0071e3">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
                </svg>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{profile.username}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginLeft: 'auto' }}>
          <StatPill label="Followers"    value={fmt(profile.followers_count)} />
          <StatPill label="Following"    value={fmt(profile.following_count)} />
          <StatPill label="Posts"        value={fmt(profile.media_count)} />
          <StatPill label="Avg Likes"    value={fmt(Math.round(avgLikes))} />
          <StatPill label="Avg Comments" value={fmt(Math.round(avgComments))} />
          <StatPill label="Engagement"   value={erStr} color="#16a34a" />
        </div>
      </div>

      {/* Posts grid + sparkline */}
      {media.length > 0 ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
            {media.map(post => (
              <PostThumbnail key={post.id} post={post} isTop={post.id === topPostId && post.like_count > 0} />
            ))}
          </div>

          {/* Footer: media breakdown + sparkline */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {photoCount > 0 && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                  </svg>
                  {photoCount} photo{photoCount !== 1 ? 's' : ''}
                </span>
              )}
              {videoCount > 0 && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  {videoCount} video{videoCount !== 1 ? 's' : ''}
                </span>
              )}
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>
                (last {media.length} posts)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Likes trend
              </span>
              <Sparkline values={sparkValues} color={inf.color || 'var(--accent)'} />
            </div>
          </div>
        </>
      ) : (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '8px 0' }}>No posts found.</div>
      )}
    </div>
  )
}

// ── API Key Setup ─────────────────────────────────────────────────────────────
function ApiKeySetup({ onSave }) {
  const [val, setVal] = useState('')
  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.6 }}>
        Enter your RapidAPI key to fetch Instagram analytics automatically.<br />
        Subscribe to <strong style={{ color: 'var(--text)' }}>Instagram Looter 2</strong> on RapidAPI — free tier available.
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input
          className="form-input" style={{ maxWidth: 420 }}
          placeholder="Paste your RapidAPI key here…"
          value={val}
          onChange={e => setVal(e.target.value)}
        />
        <button className="btn btn-primary btn-sm" onClick={() => val.trim() && onSave(val.trim())}>
          Save & Connect
        </button>
      </div>
    </div>
  )
}

// ── IG Analytics Section ──────────────────────────────────────────────────────
function IgAnalyticsSection({ influencers }) {
  const [apiKey, setApiKey]   = useState(() => localStorage.getItem(LS_KEY) || '')
  const [igData, setIgData]   = useState({})
  const [editKey, setEditKey] = useState(false)

  const igInfluencers = influencers.filter(inf =>
    inf.accounts?.find(a => a.platform === 'ig' && a.username)
  )

  useEffect(() => {
    if (!apiKey || !igInfluencers.length) return
    const pending = {}
    igInfluencers.forEach(inf => { pending[inf.id] = null })
    setIgData(pending)

    igInfluencers.forEach(inf => {
      const username = inf.accounts.find(a => a.platform === 'ig').username
      fetchInstagramData(username, apiKey)
        .then(data => setIgData(prev => ({ ...prev, [inf.id]: data })))
        .catch(err  => setIgData(prev => ({ ...prev, [inf.id]: { error: err.message } })))
    })
  }, [apiKey, influencers.map(i => i.id).join(',')])

  function saveKey(key) {
    localStorage.setItem(LS_KEY, key)
    setApiKey(key)
    setEditKey(false)
  }

  function removeKey() {
    localStorage.removeItem(LS_KEY)
    setApiKey('')
    setIgData({})
  }

  return (
    <div className="card" style={{ gridColumn: '1 / -1' }}>
      <div className="card-header">
        <span className="card-title">Instagram Analytics</span>
        {apiKey && !editKey && (
          <div style={{ display: 'flex', gap: 10, marginLeft: 'auto', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {igInfluencers.length} account{igInfluencers.length !== 1 ? 's' : ''} connected
            </span>
            <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }} onClick={() => setEditKey(true)}>
              Change key
            </button>
          </div>
        )}
      </div>
      <div className="card-body" style={{ paddingTop: 8 }}>
        {(!apiKey || editKey) && <ApiKeySetup onSave={saveKey} />}

        {apiKey && !editKey && igInfluencers.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '12px 0' }}>
            No Instagram accounts configured. Open an influencer → Account → enter the Instagram username.
          </div>
        )}

        {apiKey && !editKey && igInfluencers.length > 0 && (
          <>
            <IgSummaryRow igInfluencers={igInfluencers} igData={igData} />
            <IgComparisonChart igInfluencers={igInfluencers} igData={igData} />

            {igInfluencers.map(inf => {
              const d = igData[inf.id]
              if (d === null || d === undefined) return (
                <div key={inf.id} style={{ padding: '14px 0', color: 'var(--text-muted)', fontSize: 13, borderTop: '1px solid var(--border)' }}>
                  Loading {inf.name}…
                </div>
              )
              if (d.error) return (
                <div key={inf.id} style={{ padding: '14px 0', display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
                  <div className="avatar" style={{ background: inf.color, width: 28, height: 28, fontSize: 11 }}>
                    {inf.name[0].toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{inf.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--red, #dc2626)' }}>
                    {d.error.includes('401') || d.error.includes('403')
                      ? 'Invalid API key — check your RapidAPI key'
                      : `API error: ${d.error}`}
                  </span>
                  <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto', fontSize: 11 }} onClick={removeKey}>
                    Reset key
                  </button>
                </div>
              )
              return <IgInfluencerCard key={inf.id} inf={inf} igData={d} />
            })}
          </>
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Analytics() {
  const [influencers, setInfluencers] = useState([])
  const [workflows, setWorkflows]     = useState([])

  useEffect(() => {
    Promise.all([
      Store.getAll(),
      supabase.from('workflows').select('id, name, influencer_id, nodes, updated_at').order('updated_at', { ascending: false }),
    ]).then(([infs, { data: wfRows }]) => {
      setInfluencers(infs)
      setWorkflows(wfRows || [])
    })
  }, [])

  if (influencers.length === 0) {
    return (
      <div className="empty-state" style={{ marginTop: 40 }}>
        <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        <div className="empty-title">No data yet</div>
        <div className="empty-sub">Analytics will populate once you create influencers and generate content.</div>
      </div>
    )
  }

  const active = influencers.filter(i => i.status === 'active').length
  const paused = influencers.filter(i => i.status === 'paused').length
  const draft  = influencers.length - active - paused
  const infMap = Object.fromEntries(influencers.map(i => [i.id, i]))

  return (
    <>
      <div className="section-header">
        <div className="section-sub">Performance overview across all influencers</div>
        <button className="btn btn-secondary btn-sm">Export CSV</button>
      </div>

      <div className="analytics-grid">

        {/* Status Distribution */}
        <div className="card">
          <div className="card-header"><span className="card-title">Status Distribution</span></div>
          <div className="card-body">
            <div className="donut-wrap">
              <div className="donut">
                <svg viewBox="0 0 36 36" width="90" height="90">
                  {renderDonutSegments(influencers)}
                </svg>
                <div className="donut-label">{influencers.length}</div>
              </div>
              <div className="donut-legend">
                {[
                  ['Active', '#0055b3', active],
                  ['Paused', '#3395f5', paused],
                  ['Draft',  '#a8d4ff', draft],
                ].map(([label, dotColor, count]) => (
                  <div key={label} className="legend-item">
                    <div className="legend-dot" style={{ background: dotColor }} />
                    <span style={{ flex: 1, fontSize: 12 }}>{label}</span>
                    <span style={{ fontWeight: 700, fontSize: 12 }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Posts Generated */}
        <div className="card">
          <div className="card-header"><span className="card-title">Posts Generated</span></div>
          <div className="card-body">
            <div style={{
              height: 160, borderRadius: 10, background: 'var(--surface2)',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              padding: '16px 12px 12px', marginTop: 12, overflow: 'hidden',
            }}>
              <div className="chart-bars" style={{ width: '100%', justifyContent: 'center' }}>
                {influencers.map((inf, idx) => {
                  const h = Math.max(16, (inf.postsGenerated || 0) * 10 + 20)
                  return (
                    <div key={inf.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <div className="bar" style={{ height: Math.min(h, 100), background: inf.color || '#0071e3', width: 28 }} />
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
                        {inf.name.split(' ')[0].slice(0, 6)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Instagram Analytics — full width, before Pipeline */}
        <IgAnalyticsSection influencers={influencers} />

        {/* Pipeline Overview */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header"><span className="card-title">Pipeline Overview</span></div>
          <div className="card-body" style={{ paddingTop: 16 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Influencer</th><th>Pipeline</th><th>Nodes</th><th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {workflows.map(wf => {
                  const inf = infMap[wf.influencer_id]
                  if (!inf) return null
                  return (
                    <tr key={wf.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="avatar" style={{ background: inf.color, width: 24, height: 24, fontSize: 10 }}>
                            {inf.refImages?.[0]
                              ? <img src={inf.refImages[0]} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} alt="" />
                              : inf.name[0].toUpperCase()
                            }
                          </div>
                          {inf.name}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{wf.name}</td>
                      <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{wf.nodes?.length || 0} nodes</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(wf.updated_at).toLocaleDateString()}
                      </td>
                    </tr>
                  )
                })}
                {workflows.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                      No pipelines yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  )
}
