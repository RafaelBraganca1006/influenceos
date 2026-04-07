import { supabase } from './supabase'

// Convert a base64 data URL to a Blob
function dataUrlToBlob(dataUrl) {
  const [header, data] = dataUrl.split(',')
  const mimeType = header.match(/:(.*?);/)[1]
  const byteStr  = atob(data)
  const ab = new ArrayBuffer(byteStr.length)
  const ia = new Uint8Array(ab)
  for (let i = 0; i < byteStr.length; i++) ia[i] = byteStr.charCodeAt(i)
  return { blob: new Blob([ab], { type: mimeType }), mimeType }
}

// Upload a base64 data URL to Supabase Storage.
// path should NOT include extension — it is derived from mimeType.
// Returns the public URL.
export async function uploadImage(dataUrl, bucket, path) {
  const { blob, mimeType } = dataUrlToBlob(dataUrl)
  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'
  const fullPath = `${path}.${ext}`
  const { error } = await supabase.storage.from(bucket).upload(fullPath, blob, {
    contentType: mimeType,
    upsert: true,
  })
  if (error) throw new Error(`Storage upload failed: ${error.message}`)
  const { data } = supabase.storage.from(bucket).getPublicUrl(fullPath)
  return data.publicUrl
}
