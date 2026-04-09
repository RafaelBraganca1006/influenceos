// ── Google Drive integration via GIS (browser-only) ──────────────────────────
const CLIENT_ID   = import.meta.env.VITE_GOOGLE_CLIENT_ID
const STORAGE_KEY = 'drive_token'
const SCOPE       = 'https://www.googleapis.com/auth/drive'

function loadGIS() {
  return new Promise(resolve => {
    if (window.google?.accounts) { resolve(); return }
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.onload = () => resolve()
    document.head.appendChild(s)
  })
}

// ── Token cache (localStorage + in-memory) ───────────────────────────────────
function saveToken(token) {
  const expiresAt = Date.now() + 3500 * 1000   // ~58 min (tokens live 60 min)
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, expiresAt }))
}

function loadToken() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const { token, expiresAt } = JSON.parse(raw)
    return expiresAt > Date.now() ? token : null
  } catch { return null }
}

function clearToken() { localStorage.removeItem(STORAGE_KEY) }

// Try to get a token silently (no popup). Resolves null if it can't.
function silentToken() {
  return new Promise(resolve => {
    window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      prompt: '',
      callback: res => {
        if (res.error || !res.access_token) { resolve(null); return }
        saveToken(res.access_token)
        resolve(res.access_token)
      },
    }).requestAccessToken({ prompt: '' })
    // GIS doesn't call callback if silent fails — resolve null after timeout
    setTimeout(() => resolve(null), 5000)
  })
}

// Full interactive flow (shows Google account picker popup)
function interactiveToken() {
  return new Promise((resolve, reject) => {
    window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: res => {
        if (res.error) { reject(new Error(res.error_description || res.error)); return }
        saveToken(res.access_token)
        resolve(res.access_token)
      },
    }).requestAccessToken({ prompt: 'select_account' })
  })
}

// Main export: returns a valid token, preferring cached → silent → interactive
export async function getToken(forceInteractive = false) {
  if (!CLIENT_ID) throw new Error('VITE_GOOGLE_CLIENT_ID is not set in .env')
  await loadGIS()

  if (!forceInteractive) {
    const cached = loadToken()
    if (cached) return cached

    const silent = await silentToken()
    if (silent) return silent
  }

  return interactiveToken()
}

export { clearToken }

// ── Drive API helpers ─────────────────────────────────────────────────────────
async function driveRequest(token, path, options = {}) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  })
  const data = await res.json()
  if (!res.ok) {
    if (res.status === 401) clearToken()   // token revoked — clear cache
    throw new Error(data.error?.message || 'Drive API error')
  }
  return data
}

export async function listFolders(token, parentId = 'root') {
  const q = `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
  const data = await driveRequest(token,
    `files?q=${encodeURIComponent(q)}&fields=files(id,name)&orderBy=name&pageSize=100`)
  return data.files || []
}

export async function createFolder(token, name, parentId = 'root') {
  const data = await driveRequest(token, 'files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] }),
  })
  return data.id
}

export async function uploadText(token, filename, content, parentId) {
  const metadata = { name: filename, mimeType: 'text/plain', parents: [parentId] }
  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', new Blob([content], { type: 'text/plain' }))
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
  })
  if (!res.ok) { const d = await res.json(); throw new Error(d.error?.message || 'Upload error') }
}

export async function uploadImageFromUrl(token, url, filename, parentId) {
  const imgRes = await fetch(url)
  if (!imgRes.ok) throw new Error(`Failed to fetch image: ${url}`)
  const blob = await imgRes.blob()
  const metadata = { name: filename, mimeType: blob.type || 'image/png', parents: [parentId] }
  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', blob)
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
  })
  if (!res.ok) { const d = await res.json(); throw new Error(d.error?.message || 'Upload error') }
}

export async function savePostToDrive(token, post, parentFolderId = 'root', onProgress) {
  const folderName = post.topic || post.title || 'Post'

  onProgress?.('Creating folder…')
  const folderId = await createFolder(token, folderName, parentFolderId)

  const images = (post.images || []).filter(img => img.src)
  for (let i = 0; i < images.length; i++) {
    onProgress?.(`Uploading slide ${i + 1} / ${images.length}…`)
    await uploadImageFromUrl(token, images[i].src, `slide-${images[i].position}.png`, folderId)
  }

  if (post.caption || post.hashtags?.length) {
    onProgress?.('Uploading caption…')
    const lines = []
    if (post.caption)          lines.push(post.caption)
    if (post.hashtags?.length) lines.push('\n' + post.hashtags.join(' '))
    await uploadText(token, 'caption.txt', lines.join('\n'), folderId)
  }

  onProgress?.('Done')
  return `https://drive.google.com/drive/folders/${folderId}`
}
