import { useState } from 'react'
import { supabase } from '../supabase'

export default function Auth() {
  const [mode, setMode]       = useState('login') // 'login' | 'signup' | 'reset'
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [message, setMessage] = useState('')
  const [showPass, setShowPass] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      })
      setLoading(false)
      if (error) { setError(error.message); return }
      setMessage('Check your email for a password reset link.')
      return
    }

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      setLoading(false)
      if (error) { setError(error.message); return }
      setMessage('Account created! Check your email to confirm.')
      return
    }

    // login
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
  }

  const titles = { login: 'Welcome back', signup: 'Create account', reset: 'Reset password' }
  const subs   = { login: 'Sign in to InfluenceOS', signup: 'Get started for free', reset: 'We\'ll send you a reset link' }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:32, justifyContent:'center' }}>
          <div style={{
            width:36, height:36, borderRadius:10, background:'var(--accent)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
            </svg>
          </div>
          <span style={{ fontSize:18, fontWeight:800, letterSpacing:'-0.3px' }}>
            Influence<span style={{ color:'var(--accent)' }}>OS</span>
          </span>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 32 }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.5px', marginBottom:4 }}>
              {titles[mode]}
            </h1>
            <p style={{ fontSize:13, color:'var(--text-muted)' }}>{subs[mode]}</p>
          </div>

          {message && (
            <div style={{
              background: 'var(--green-bg)', color:'var(--green)',
              borderRadius:9, padding:'10px 14px', fontSize:13,
              fontWeight:500, marginBottom:18,
            }}>
              {message}
            </div>
          )}

          {error && (
            <div style={{
              background: 'var(--red-bg)', color:'var(--red)',
              borderRadius:9, padding:'10px 14px', fontSize:13,
              fontWeight:500, marginBottom:18,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom:14 }}>
              <label className="form-label">Email</label>
              <input
                className="form-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            {mode !== 'reset' && (
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-muted)', padding: 4, display: 'flex', alignItems: 'center',
                    }}
                    tabIndex={-1}
                    title={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {mode === 'login' && (
              <div style={{ textAlign:'right', marginTop:-12, marginBottom:20 }}>
                <button
                  type="button"
                  onClick={() => { setMode('reset'); setError(''); setMessage('') }}
                  style={{ background:'none', border:'none', color:'var(--accent)', fontSize:12, cursor:'pointer', fontFamily:'inherit', fontWeight:500 }}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ width:'100%', justifyContent:'center', height:40 }}
            >
              {loading ? 'Loading...' : mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
            </button>
          </form>

          {/* Mode switch */}
          <div style={{ marginTop:22, textAlign:'center', fontSize:13, color:'var(--text-muted)' }}>
            {mode === 'login' && (
              <>Don't have an account?{' '}
                <button onClick={() => { setMode('signup'); setError(''); setMessage('') }} style={{ background:'none', border:'none', color:'var(--accent)', fontWeight:600, cursor:'pointer', fontFamily:'inherit', fontSize:13 }}>
                  Sign up
                </button>
              </>
            )}
            {mode === 'signup' && (
              <>Already have an account?{' '}
                <button onClick={() => { setMode('login'); setError(''); setMessage('') }} style={{ background:'none', border:'none', color:'var(--accent)', fontWeight:600, cursor:'pointer', fontFamily:'inherit', fontSize:13 }}>
                  Sign in
                </button>
              </>
            )}
            {mode === 'reset' && (
              <button onClick={() => { setMode('login'); setError(''); setMessage('') }} style={{ background:'none', border:'none', color:'var(--accent)', fontWeight:600, cursor:'pointer', fontFamily:'inherit', fontSize:13 }}>
                ← Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
