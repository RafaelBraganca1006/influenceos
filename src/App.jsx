import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Auth from './pages/Auth'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Influencers from './pages/Influencers'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import InfluencerDetail from './pages/InfluencerDetail'
import PipelineBuilder from './pages/PipelineBuilder'
import CarouselPipeline from './pages/CarouselPipeline'

const PAGE_TITLES = {
  dashboard:          'Dashboard',
  influencers:        'Virtual Influencers',
  analytics:          'Analytics',
  settings:           'Settings',
  'carousel-pipeline': 'Carousel Pipeline',
}

export default function App() {
  const [session, setSession] = useState(undefined)
  const [page, setPage]       = useState('dashboard')
  const [detailId, setDetailId] = useState(null)
  const [pipelineCtx, setPipelineCtx] = useState(null)   // { influencerId, workflowId }
  const [carouselInfId, setCarouselInfId] = useState(null)
  const [influencerCount, setInfluencerCount] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  function openDetail(id) { setDetailId(id); setPage('detail') }
  function closeDetail()  { setDetailId(null); setPage('influencers') }

  function openPipelineBuilder(influencerId, workflowId = null) {
    setPipelineCtx({ influencerId, workflowId })
    setPage('pipeline-builder')
  }
  function closePipelineBuilder() {
    const influencerId = pipelineCtx?.influencerId
    setPipelineCtx(null)
    if (influencerId) { setDetailId(influencerId); setPage('detail') }
    else setPage('influencers')
  }

  function openCarouselPipeline(influencerId) {
    setCarouselInfId(influencerId)
    setPage('carousel-pipeline')
  }
  function closeCarouselPipeline() {
    const infId = carouselInfId
    setCarouselInfId(null)
    if (infId) { setDetailId(infId); setPage('detail') }
    else setPage('influencers')
  }

  async function handleSignOut() { await supabase.auth.signOut() }

  if (session === undefined) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
        <div style={{ color:'var(--text-muted)', fontSize:14 }}>Loading...</div>
      </div>
    )
  }
  if (!session) return <Auth />

  const isPipelineBuilder  = page === 'pipeline-builder'
  const isCarouselPipeline = page === 'carousel-pipeline'
  const title = page === 'detail' ? 'Influencer' : PAGE_TITLES[page] || ''

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        setPage={p => { setDetailId(null); setPipelineCtx(null); setPage(p) }}
        count={influencerCount}
      />
      <div className="main-area">
        {/* Hide topbar in pipeline builder — it has its own */}
        {!isPipelineBuilder && (
          <header className="topbar">
            {page === 'detail' && (
              <button className="btn btn-secondary btn-sm" onClick={closeDetail} style={{ gap:5, marginRight:8, flexShrink:0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                Influencers
              </button>
            )}
            {isCarouselPipeline && (
              <button className="btn btn-secondary btn-sm" onClick={closeCarouselPipeline} style={{ gap:5, marginRight:8, flexShrink:0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                Back
              </button>
            )}
            <div className="topbar-title">{title}</div>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ fontSize:13, color:'var(--text-muted)' }}>{session.user.email}</span>
              <button className="btn btn-secondary btn-sm" onClick={handleSignOut}>Sign out</button>
            </div>
          </header>
        )}

        <div className={isPipelineBuilder ? 'page-content-full' : 'page-content'}>
          {page === 'dashboard'    && <Dashboard onOpenDetail={openDetail} />}
          {page === 'influencers'  && <Influencers onOpenDetail={openDetail} onCountChange={setInfluencerCount} />}
          {page === 'analytics'    && <Analytics />}
          {page === 'settings'     && <Settings />}
          {page === 'detail' && detailId && (
            <InfluencerDetail
              id={detailId}
              onBack={closeDetail}
              onOpenPipeline={(wfId) => openPipelineBuilder(detailId, wfId)}
              onNewPipeline={() => openPipelineBuilder(detailId, null)}
              onNewCarousel={() => openCarouselPipeline(detailId)}
            />
          )}
          {page === 'carousel-pipeline' && carouselInfId && (
            <CarouselPipeline
              influencerId={carouselInfId}
              onBack={closeCarouselPipeline}
            />
          )}
          {page === 'pipeline-builder' && pipelineCtx && (
            <PipelineBuilder
              influencerId={pipelineCtx.influencerId}
              workflowId={pipelineCtx.workflowId}
              onBack={closePipelineBuilder}
            />
          )}
        </div>
      </div>
    </div>
  )
}
