import { useState, useEffect } from 'react'
import { Store } from '../store'
import { supabase } from '../supabase'

const BLUE_TONES = ['#0055b3', '#0071e3', '#3395f5', '#6cb8ff', '#a8d4ff']

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
      <circle
        key={i} cx="18" cy="18" r={r}
        fill="none" stroke={s.color} strokeWidth="3.5"
        strokeDasharray={`${pct} ${circ - pct}`}
        strokeDashoffset={100 - offset}
        strokeLinecap="round"
      />
    )
    offset -= pct
    return el
  })
}

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
        <div className="card">
          <div className="card-header"><span className="card-title">Posts by Influencer</span></div>
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
                    <div key={inf.id} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                      <div className="bar" style={{ height: Math.min(h, 100), background: BLUE_TONES[idx % BLUE_TONES.length], width: 28 }} />
                      <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600 }}>
                        {inf.name.split(' ')[0].slice(0, 6)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

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
                  ['active', '#0055b3', active],
                  ['paused', '#3395f5', paused],
                  ['draft',  '#a8d4ff', draft],
                ].map(([label, dotColor, count]) => (
                  <div key={label} className="legend-item">
                    <div className="legend-dot" style={{ background: dotColor }} />
                    <span style={{ flex:1, textTransform:'capitalize', fontSize:12 }}>{label}</span>
                    <span style={{ fontWeight:700, fontSize:12 }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

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
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div className="avatar" style={{ background: inf.color, width:24, height:24, fontSize:10 }}>
                            {inf.refImages?.[0]
                              ? <img src={inf.refImages[0]} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }} alt="" />
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
                    <td colSpan={4} style={{ textAlign:'center', color:'var(--text-muted)', padding:24 }}>
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
