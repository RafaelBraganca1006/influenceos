// ── Veo 3 video generation service ───────────────────────────────────────────
const VEO_MODEL = 'veo-3.1-generate-preview'
const BASE_URL  = 'https://generativelanguage.googleapis.com/v1beta'

// Fetch a public image URL and return its raw base64 data (no data-URL prefix)
export async function urlToBase64(url) {
  const res  = await fetch(url)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result.split(',')[1])
    reader.onerror  = reject
    reader.readAsDataURL(blob)
  })
}

// Start an async video generation job.
// firstFrameB64 / lastFrameB64: raw base64 strings (no data-URL prefix), may be null.
// Returns the operation name string.
export async function startVideoGeneration(apiKey, { firstFrameB64, lastFrameB64, motionPrompt, aspectRatio = '9:16' }) {
  const instance = { prompt: motionPrompt }

  if (firstFrameB64) {
    instance.image = { bytesBase64Encoded: firstFrameB64, mimeType: 'image/png' }
  }
  if (lastFrameB64) {
    instance.lastFrame = { bytesBase64Encoded: lastFrameB64, mimeType: 'image/png' }
  }

  const url = `${BASE_URL}/models/${VEO_MODEL}:predictLongRunning?key=${apiKey}`
  const res  = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances:  [instance],
      parameters: { aspectRatio, durationSeconds: 8, resolution: '720p' },
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Veo API error')
  if (!data.name) throw new Error('Veo did not return an operation name')
  return data.name
}

// Poll the operation once. Returns { done, videoUrl | null, error | null }
export async function pollOperation(apiKey, operationName) {
  const url  = `${BASE_URL}/${operationName}?key=${apiKey}`
  const res  = await fetch(url)
  const data = await res.json()
  if (!res.ok) return { done: false, videoUrl: null, error: data.error?.message || 'Poll error' }
  if (!data.done) return { done: false, videoUrl: null, error: null }

  const videoUrl =
    data.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri ||
    data.response?.videos?.[0]?.uri ||
    null

  const error = videoUrl ? null : (data.error?.message || 'No video in response')
  return { done: true, videoUrl, error }
}
