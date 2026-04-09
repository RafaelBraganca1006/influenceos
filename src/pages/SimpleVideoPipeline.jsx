import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'
import { Store } from '../store'
import { uploadImage } from '../storage'
import {
  generateVideoIdea, generateVideoPrompts,
  buildVideoIdeaPrompt, buildVideoPromptsPrompt,
  generateSlideImage,
} from '../services/generator'
import { startVideoGeneration, pollOperation } from '../services/veo'

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      style={{ animation: 'spin 0.8s linear infinite' }}>
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
    </svg>
  )
}

// ── Phase status dot ──────────────────────────────────────────────────────────
function StepCircle({ n, done, active }) {
  return (
    <div style={{
      width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: done ? 'var(--accent)' : active ? 'var(--surface2)' : 'var(--surface2)',
      border: `2px solid ${done ? 'var(--accent)' : active ? 'var(--accent)' : 'var(--border)'}`,
      color: done ? 'white' : active ? 'var(--accent)' : 'var(--text-muted)',
      fontSize: 11, fontWeight: 700, flexShrink: 0,
    }}>
      {done
        ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
        : n}
    </div>
  )
}

// ── Phase card ────────────────────────────────────────────────────────────────
function PhaseCard({ n, title, status, error, children, right }) {
  const [open, setOpen] = useState(true)
  const done   = status === 'done'
  const active = status === 'loading' || (status === 'idle' && open)
  return (
    <div style={{ background: 'var(--surface)', border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`, borderRadius: 14, overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: 'pointer', userSelect: 'none' }}
      >
        <StepCircle n={n} done={done} active={active} />
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, letterSpacing: '-0.2px' }}>{title}</span>
        {right && <div onClick={e => e.stopPropagation()}>{right}</div>}
        {status === 'loading' && <Spinner />}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ color: 'var(--text-muted)', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      {error && <div style={{ margin: '0 18px 10px', fontSize: 12, color: 'var(--red)', padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8 }}>{error}</div>}
      {open && <div style={{ padding: '0 18px 18px' }}>{children}</div>}
    </div>
  )
}

// ── Prompt editor ─────────────────────────────────────────────────────────────
function PromptEditor({ label, value, onChange, rows = 4, mono = false }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{label}</div>}
      <textarea
        className="form-input"
        rows={rows}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        style={{ resize: 'vertical', fontFamily: mono ? 'monospace' : 'inherit', fontSize: 12, lineHeight: 1.5 }}
      />
    </div>
  )
}

// ── Frame image card ──────────────────────────────────────────────────────────
function FrameCard({ label, src, status, error, onRegenerate, busy }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{label}</div>
      <div style={{
        position: 'relative', paddingTop: '177%', background: 'var(--surface2)',
        borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)',
      }}>
        {src && <img src={src} alt={label} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
        {status === 'loading' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(0,0,0,0.5)' }}>
            <Spinner />
            <span style={{ fontSize: 11, color: 'white' }}>Generating…</span>
          </div>
        )}
        {!src && status !== 'loading' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </div>
        )}
        {src && (
          <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
            <a href={src} download={`${label.toLowerCase().replace(' ', '-')}.png`}
              style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', textDecoration: 'none' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </a>
          </div>
        )}
      </div>
      {error && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 6 }}>{error}</div>}
      {onRegenerate && (
        <button className="btn btn-secondary btn-sm" style={{ marginTop: 8, width: '100%', gap: 5 }} onClick={onRegenerate} disabled={busy}>
          {status === 'loading' ? <><Spinner /> Generating…</> : src ? 'Regenerate' : 'Generate'}
        </button>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SimpleVideoPipeline({ influencerId, pipelineId, onBack }) {
  const [pip,  setPip]  = useState(null)
  const [inf,  setInf]  = useState(null)
  const [geminiKey, setGeminiKey] = useState('')
  const [loading, setLoading] = useState(true)

  // Phase 1 – Ideation
  const [idea,        setIdea]        = useState(null)
  const [ideaMode,    setIdeaMode]    = useState('auto')
  const [manualConcept, setManualConcept] = useState('')
  const [manualMood,  setManualMood]  = useState('')
  const [p1Prompt,    setP1Prompt]    = useState(null)
  const [p1Status,    setP1Status]    = useState('idle')
  const [p1Error,     setP1Error]     = useState('')
  const [p1Open,      setP1Open]      = useState(false)

  // Phase 2 – Prompts
  const [prompts,  setPrompts]  = useState(null)  // { firstFramePrompt, lastFramePrompt, motionPrompt }
  const [p2Prompt, setP2Prompt] = useState(null)
  const [p2Status, setP2Status] = useState('idle')
  const [p2Error,  setP2Error]  = useState('')
  const [p2Open,   setP2Open]   = useState(false)

  // Phase 3 – Image generation
  const [firstFrameSrc, setFirstFrameSrc] = useState(null)
  const [lastFrameSrc,  setLastFrameSrc]  = useState(null)
  const [firstFrameB64, setFirstFrameB64] = useState(null)  // kept for Veo
  const [lastFrameB64,  setLastFrameB64]  = useState(null)
  const [p3FirstStatus, setP3FirstStatus] = useState('idle')
  const [p3LastStatus,  setP3LastStatus]  = useState('idle')
  const [p3FirstError,  setP3FirstError]  = useState('')
  const [p3LastError,   setP3LastError]   = useState('')

  // Phase 4 – Video generation
  const [videoUrl,       setVideoUrl]       = useState(null)
  const [p4Status,       setP4Status]       = useState('idle')
  const [p4Error,        setP4Error]        = useState('')
  const [p4Progress,     setP4Progress]     = useState('')
  const pollRef = useRef(null)
  const opNameRef = useRef(null)

  const execKeyRef = useRef(genId())

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      supabase.from('video_pipelines').select('*').eq('id', pipelineId).single(),
      supabase.from('api_keys').select('gemini_key').single(),
    ]).then(([{ data: pipRow }, { data: keys }]) => {
      if (pipRow) {
        setPip(pipRow)
        setIdeaMode(pipRow.idea_mode || 'auto')
      }
      if (keys?.gemini_key) setGeminiKey(keys.gemini_key)
      setLoading(false)
    })

    // Load influencer (Store.get maps ref_images → refImages)
    Store.get(influencerId).then(data => { if (data) setInf(data) })

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [pipelineId, influencerId])

  // ── Save helpers ──────────────────────────────────────────────────────────
  const save = useCallback(async (patch) => {
    await supabase.from('video_pipelines').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', pipelineId)
  }, [pipelineId])

  // ── Phase 1 executor ──────────────────────────────────────────────────────
  async function executePhase1() {
    if (!geminiKey) throw new Error('No Gemini API key — go to Settings.')
    setP1Status('loading'); setP1Error('')
    setIdea(null); setPrompts(null)
    setP2Status('idle')
    setFirstFrameSrc(null); setFirstFrameB64(null); setP3FirstStatus('idle'); setP3FirstError('')
    setLastFrameSrc(null);  setLastFrameB64(null);  setP3LastStatus('idle');  setP3LastError('')
    setVideoUrl(null); setP4Status('idle'); setP4Error('')
    execKeyRef.current = genId()

    let result
    if (ideaMode === 'manual') {
      if (!manualConcept.trim()) throw new Error('Enter a video concept first.')
      result = { concept: manualConcept.trim(), mood: manualMood.trim() || 'cinematic' }
    } else {
      const defaults = buildVideoIdeaPrompt(inf)
      const prompt   = p1Prompt || defaults
      result = await generateVideoIdea(geminiKey, inf, prompt)
    }
    save({ idea_mode: ideaMode })

    setIdea(result)
    setP1Status('done')
    return result
  }

  // ── Phase 2 executor ──────────────────────────────────────────────────────
  async function executePhase2(ideaOverride) {
    const currentIdea = ideaOverride || idea
    if (!currentIdea?.concept) throw new Error('Generate or enter an idea first.')
    if (!geminiKey) throw new Error('No Gemini API key — go to Settings.')
    setP2Status('loading'); setP2Error('')
    setFirstFrameSrc(null); setFirstFrameB64(null); setP3FirstStatus('idle'); setP3FirstError('')
    setLastFrameSrc(null);  setLastFrameB64(null);  setP3LastStatus('idle');  setP3LastError('')
    setVideoUrl(null); setP4Status('idle'); setP4Error('')
    execKeyRef.current = genId()

    const defaults = buildVideoPromptsPrompt(inf, currentIdea)
    const prompt   = p2Prompt || defaults
    const result   = await generateVideoPrompts(geminiKey, inf, currentIdea, prompt)
    setPrompts(result)
    setP2Status('done')
    return result
  }

  // ── Phase 3: generate one frame ───────────────────────────────────────────
  // firstFrameB64Override: raw base64 (no prefix) — used when generating last frame
  // immediately after first frame within the same run (before state has updated).
  async function generateFrame(framePrompt, which, firstFrameB64Override) {
    if (!geminiKey) throw new Error('No Gemini key.')
    if (which === 'first') { setP3FirstStatus('loading'); setP3FirstError('') }
    else                   { setP3LastStatus('loading');  setP3LastError('') }

    try {
      const { data: { user } } = await supabase.auth.getUser()

      let refImages
      if (which === 'first') {
        refImages = inf?.refImages || []
      } else {
        // First frame + one ref image for consistency
        const b64 = firstFrameB64Override || firstFrameB64
        const extras = inf?.refImages?.length ? [inf.refImages[0]] : []
        if (b64) {
          refImages = [`data:image/png;base64,${b64}`, ...extras]
        } else {
          refImages = extras
        }
      }

      const base64DataUrl = await generateSlideImage(geminiKey, framePrompt, refImages)
      const rawB64 = base64DataUrl.split(',')[1]

      const key = `${user.id}/${pipelineId}/${execKeyRef.current}/${which}-frame`
      const url = await uploadImage(base64DataUrl, 'carousel-images', key)

      if (which === 'first') {
        setFirstFrameSrc(url); setFirstFrameB64(rawB64); setP3FirstStatus('done')
      } else {
        setLastFrameSrc(url); setLastFrameB64(rawB64); setP3LastStatus('done')
      }

      return rawB64
    } catch (err) {
      if (which === 'first') { setP3FirstStatus('error'); setP3FirstError(err.message) }
      else                   { setP3LastStatus('error');  setP3LastError(err.message) }
    }
  }

  async function generateBothFrames(promptsOverride) {
    const p = promptsOverride || prompts
    if (!p) { setP3FirstError('Generate prompts first.'); return }
    // Sequential: last frame uses first frame as reference
    const firstB64 = await generateFrame(p.firstFramePrompt, 'first')
    await generateFrame(p.lastFramePrompt, 'last', firstB64)
  }

  // ── Phase 4: generate video ───────────────────────────────────────────────
  // promptsOverride / firstB64Override / lastB64Override: passed from runAll to avoid stale closure
  async function executePhase4(promptsOverride, firstB64Override, lastB64Override) {
    const currentPrompts = promptsOverride || prompts
    if (!geminiKey) throw new Error('No Gemini API key — go to Settings.')
    if (!currentPrompts?.motionPrompt) throw new Error('Generate prompts first (Phase 2).')

    setP4Status('loading'); setP4Error(''); setP4Progress('Preparing frames…')

    const firstB64 = firstB64Override || firstFrameB64
    const lastB64  = lastB64Override  || lastFrameB64

    if (!firstB64) throw new Error('Generate the first frame image first (Phase 3).')

    setP4Progress('Uploading frames + starting generation…')
    const { data: pipRow } = await supabase.from('video_pipelines').select('aspect_ratio').eq('id', pipelineId).single()
    const aspectRatio = pipRow?.aspect_ratio || '9:16'

    const operationName = await startVideoGeneration(geminiKey, {
      firstFrameB64: firstB64,
      lastFrameB64:  lastB64 || undefined,
      motionPrompt:  currentPrompts.motionPrompt,
      aspectRatio,
    })

    opNameRef.current = operationName
    setP4Progress('Generating video… this may take 2-4 minutes')

    pollRef.current = setInterval(async () => {
      try {
        const result = await pollOperation(geminiKey, operationName)
        if (result.error && result.done) {
          clearInterval(pollRef.current)
          setP4Status('error'); setP4Error(result.error)
        } else if (result.done && result.videoUrl) {
          clearInterval(pollRef.current)
          const authedUrl = `${result.videoUrl}${result.videoUrl.includes('?') ? '&' : '?'}key=${geminiKey}`
          setVideoUrl(authedUrl)
          setP4Status('done')
          await saveExecution(authedUrl)
        }
      } catch (err) {
        clearInterval(pollRef.current)
        setP4Status('error'); setP4Error(err.message)
      }
    }, 10000)
  }

  async function saveExecution(url) {
    const { data: { user } } = await supabase.auth.getUser()
    const { count } = await supabase.from('video_executions')
      .select('*', { count: 'exact', head: true }).eq('influencer_id', influencerId)
    await supabase.from('video_executions').insert({
      id:             genId(),
      pipeline_id:    pipelineId,
      influencer_id:  influencerId,
      user_id:        user.id,
      title:          `Video #${(count || 0) + 1}`,
      idea:           idea?.concept || '',
      first_frame_src: firstFrameSrc,
      last_frame_src:  lastFrameSrc,
      video_url:       url,
    })
  }

  // ── Run all phases ────────────────────────────────────────────────────────
  async function runAll() {
    try {
      const ideaResult    = await executePhase1()
      const promptsResult = await executePhase2(ideaResult)
      // generateBothFrames returns [firstB64, lastB64] so we can pass them forward
      const firstB64 = await generateFrame(promptsResult.firstFramePrompt, 'first')
      const lastB64  = await generateFrame(promptsResult.lastFramePrompt,  'last', firstB64)
      await executePhase4(promptsResult, firstB64, lastB64)
    } catch (err) {
      // errors already set inside each phase
    }
  }

  const p3Busy = p3FirstStatus === 'loading' || p3LastStatus === 'loading'
  const busy   = p1Status === 'loading' || p2Status === 'loading' || p3Busy || p4Status === 'loading'

  if (loading || !pip) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-muted)', fontSize: 14 }}>Loading…</div>
  }

  const p1DefaultPrompt = inf ? buildVideoIdeaPrompt(inf) : null
  const p2DefaultPrompt = inf && idea ? buildVideoPromptsPrompt(inf, idea) : null

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <button className="btn btn-secondary btn-sm" onClick={onBack} style={{ gap: 5 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pip.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{pip.aspect_ratio} · Simple Video · Veo 3</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={runAll} disabled={busy} style={{ gap: 6, flexShrink: 0 }}>
          {busy ? <><Spinner /> Running…</> : <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Run All
          </>}
        </button>
      </div>

      {/* Phase 1 — Ideation */}
      <PhaseCard n={1} title="Ideation" status={p1Status} error={p1Error}
        right={
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setP1Open(o => !o)}>
            {p1Open ? 'Hide prompt' : 'Edit prompt'}
          </button>
        }
      >
        {/* Mode selector */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {[['auto','Auto'],['manual','Manual']].map(([val, label]) => (
            <button key={val} onClick={() => setIdeaMode(val)} style={{
              padding: '4px 12px', borderRadius: 20, border: '1px solid',
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
              background: ideaMode === val ? 'var(--accent)' : 'transparent',
              borderColor: ideaMode === val ? 'var(--accent)' : 'var(--border)',
              color: ideaMode === val ? 'white' : 'var(--text-muted)',
            }}>{label}</button>
          ))}
        </div>

        {ideaMode === 'manual' ? (
          <>
            <div className="form-group" style={{ marginBottom: 10 }}>
              <label className="form-label">Video Concept</label>
              <input className="form-input" value={manualConcept} onChange={e => setManualConcept(e.target.value)} placeholder="A chef plating a dish in slow motion…" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Mood</label>
              <input className="form-input" value={manualMood} onChange={e => setManualMood(e.target.value)} placeholder="cinematic, warm, intimate…" />
            </div>
          </>
        ) : (
          p1Open && p1DefaultPrompt && (
            <>
              <PromptEditor label="System" value={p1Prompt?.system ?? p1DefaultPrompt.system} onChange={v => setP1Prompt(p => ({ ...(p || p1DefaultPrompt), system: v }))} rows={3} />
              <PromptEditor label="User" value={p1Prompt?.user ?? p1DefaultPrompt.user} onChange={v => setP1Prompt(p => ({ ...(p || p1DefaultPrompt), user: v }))} rows={5} />
            </>
          )
        )}

        {idea && (
          <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{idea.concept}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Mood: {idea.mood}</div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button className="btn btn-primary btn-sm" onClick={async () => { try { await executePhase1() } catch(e) { setP1Error(e.message); setP1Status('error') }}} disabled={busy}>
            {p1Status === 'loading' ? <><Spinner /> Generating…</> : idea ? 'Regenerate' : 'Generate Idea'}
          </button>
        </div>
      </PhaseCard>

      {/* Phase 2 — Prompts */}
      <PhaseCard n={2} title="Prompt Generation" status={p2Status} error={p2Error}
        right={
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setP2Open(o => !o)}>
            {p2Open ? 'Hide prompt' : 'Edit prompt'}
          </button>
        }
      >
        {p2Open && p2DefaultPrompt && (
          <>
            <PromptEditor label="System" value={p2Prompt?.system ?? p2DefaultPrompt.system} onChange={v => setP2Prompt(p => ({ ...(p || p2DefaultPrompt), system: v }))} rows={3} />
            <PromptEditor label="User"   value={p2Prompt?.user   ?? p2DefaultPrompt.user}   onChange={v => setP2Prompt(p => ({ ...(p || p2DefaultPrompt), user: v }))} rows={6} />
          </>
        )}

        {prompts && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: p2Open ? 14 : 0 }}>
            {[
              ['First Frame Prompt',  'firstFramePrompt'],
              ['Last Frame Prompt',   'lastFramePrompt'],
              ['Motion Description',  'motionPrompt'],
            ].map(([label, key]) => (
              <div key={key}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>{label}</div>
                <textarea
                  className="form-input"
                  rows={3}
                  value={prompts[key] || ''}
                  onChange={e => setPrompts(prev => ({ ...prev, [key]: e.target.value }))}
                  style={{ resize: 'vertical', fontSize: 12, lineHeight: 1.5 }}
                />
              </div>
            ))}
          </div>
        )}

        <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }}
          onClick={async () => { try { await executePhase2() } catch(e) { setP2Error(e.message); setP2Status('error') }}}
          disabled={busy || !idea}>
          {p2Status === 'loading' ? <><Spinner /> Generating…</> : prompts ? 'Regenerate Prompts' : 'Generate Prompts'}
        </button>
      </PhaseCard>

      {/* Phase 3 — Image Generation */}
      <PhaseCard n={3} title="Frame Generation" status={p3Busy ? 'loading' : (firstFrameSrc && lastFrameSrc) ? 'done' : 'idle'}
        error={p3FirstError || p3LastError}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
          <FrameCard
            label="First Frame"
            src={firstFrameSrc}
            status={p3FirstStatus}
            error={p3FirstError}
            busy={busy}
            onRegenerate={prompts?.firstFramePrompt ? () => generateFrame(prompts.firstFramePrompt, 'first') : null}
          />
          <FrameCard
            label="Last Frame"
            src={lastFrameSrc}
            status={p3LastStatus}
            error={p3LastError}
            busy={busy}
            onRegenerate={prompts?.lastFramePrompt ? () => generateFrame(prompts.lastFramePrompt, 'last') : null}
          />
        </div>
        <button className="btn btn-primary btn-sm"
          onClick={() => generateBothFrames()}
          disabled={busy || !prompts}>
          {p3Busy ? <><Spinner /> Generating Frames…</> : (firstFrameSrc || lastFrameSrc) ? 'Regenerate Both' : 'Generate Both Frames'}
        </button>
      </PhaseCard>

      {/* Phase 4 — Video Generation */}
      <PhaseCard n={4} title="Video Generation — Veo 3" status={p4Status} error={p4Error}>
        {p4Status === 'loading' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 14 }}>
            <Spinner />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{p4Progress}</span>
          </div>
        )}

        {videoUrl && (
          <div style={{ marginBottom: 14 }}>
            <video
              src={videoUrl}
              controls
              loop
              style={{ width: '100%', maxWidth: 340, borderRadius: 12, background: '#000', display: 'block' }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <a href={videoUrl} download="video.mp4" className="btn btn-secondary btn-sm" style={{ gap: 5 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download
              </a>
            </div>
          </div>
        )}

        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
          Requires both frames to be generated. Video generation takes 2–4 minutes.
          {' '}Generated videos are available for 48 hours from Google's servers.
        </div>

        <button className="btn btn-primary btn-sm" onClick={async () => { try { await executePhase4() } catch(e) { setP4Error(e.message); setP4Status('error') }}}
          disabled={busy || !prompts?.motionPrompt || !firstFrameSrc}>
          {p4Status === 'loading' ? <><Spinner /> Generating Video…</> : videoUrl ? 'Regenerate Video' : 'Generate Video'}
        </button>
      </PhaseCard>
    </div>
  )
}
