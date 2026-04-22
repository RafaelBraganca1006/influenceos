// ── Sliding-window rate limiter ───────────────────────────────────────────────
// Tracks call timestamps in memory (per browser tab / session).
// Two separate limiters: one for text calls, one for image calls, because
// Gemini preview image models have a much lower RPM quota than text models.

class RateLimiter {
  constructor(maxRequests, windowMs, label) {
    this.maxRequests = maxRequests
    this.windowMs    = windowMs
    this.label       = label
    this.timestamps  = []
    // Last known server-side limits read from response headers
    this.serverLimit     = null
    this.serverRemaining = null
    this.serverReset     = null
  }

  _prune() {
    const now = Date.now()
    this.timestamps = this.timestamps.filter(t => now - t < this.windowMs)
  }

  get used() { this._prune(); return this.timestamps.length }
  get limit() { return this.serverLimit ?? this.maxRequests }
  get remaining() {
    if (this.serverRemaining !== null) return this.serverRemaining
    return Math.max(0, this.limit - this.used)
  }

  // Returns ms to wait before the next call is allowed (0 = proceed immediately).
  msUntilAvailable() {
    this._prune()
    if (this.timestamps.length < this.maxRequests) return 0
    // Oldest call will fall out of the window after:
    return Math.max(0, this.windowMs - (Date.now() - this.timestamps[0]) + 100)
  }

  // Call before every request. Throws if limit is already fully exhausted
  // with no hope of a slot within a reasonable wait time.
  async acquire() {
    this._prune()
    const wait = this.msUntilAvailable()
    if (wait > 0) {
      if (wait > 60_000) {
        throw new Error(
          `Rate limit reached for ${this.label} (${this.maxRequests} req/min). ` +
          `Please wait ${Math.ceil(wait / 1000)}s before trying again.`
        )
      }
      await new Promise(r => setTimeout(r, wait))
      this._prune()
    }
    this.timestamps.push(Date.now())
  }

  // Read standard X-RateLimit-* headers from a Fetch Response and update
  // the known server-side limits.
  readHeaders(response) {
    const limit     = response.headers.get('x-ratelimit-limit-requests')
                   || response.headers.get('x-ratelimit-limit')
    const remaining = response.headers.get('x-ratelimit-remaining-requests')
                   || response.headers.get('x-ratelimit-remaining')
    const reset     = response.headers.get('x-ratelimit-reset-requests')
                   || response.headers.get('x-ratelimit-reset')

    if (limit     !== null) this.serverLimit     = parseInt(limit,     10)
    if (remaining !== null) this.serverRemaining = parseInt(remaining, 10)
    if (reset     !== null) this.serverReset      = reset
  }

  // Summary object for UI display
  status() {
    this._prune()
    return {
      label:     this.label,
      limit:     this.limit,
      used:      this.used,
      remaining: this.remaining,
      resetIn:   this.serverReset ?? `${Math.ceil(this.windowMs / 1000)}s window`,
    }
  }
}

// 5 text calls / 60s  (conservative; paid quota is 2,000 RPM but keeps costs low)
export const textLimiter  = new RateLimiter(5,  60_000, 'Gemini text')
// 4 image calls / 60s (preview model RPM is typically 4–10)
export const imageLimiter = new RateLimiter(4, 60_000, 'Gemini image')
