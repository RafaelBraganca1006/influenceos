import { supabase } from './supabase'

// ── DB ↔ JS mappers ───────────────────────────────────────────────────────────
function fromDb(row) {
  return {
    id:             row.id,
    name:           row.name,
    niche:          row.niche         || '',
    status:         row.status        || 'active',
    color:          row.color         || '#2563EB',
    platforms:      row.platforms     || [],
    refImages:      row.ref_images    || [],
    personality:    row.personality   || '',
    visualStyle:    row.visual_style  || '',
    tone:           row.tone          || '',
    audience:       row.audience      || '',
    avoid:          row.avoid         || '',
    freqIg:         row.freq_ig       || '',
    freqTt:         row.freq_tt       || '',
    freqYt:         row.freq_yt       || '',
    pipelines:      row.pipelines     || [],
    accounts:       row.accounts      || [],
    postsGenerated: row.posts_generated || 0,
    createdAt:      row.created_at,
  }
}

function toDb(data) {
  const row = {}
  if (data.name          !== undefined) row.name            = data.name
  if (data.niche         !== undefined) row.niche           = data.niche
  if (data.status        !== undefined) row.status          = data.status
  if (data.color         !== undefined) row.color           = data.color
  if (data.platforms     !== undefined) row.platforms       = data.platforms
  if (data.refImages     !== undefined) row.ref_images      = data.refImages
  if (data.personality   !== undefined) row.personality     = data.personality
  if (data.visualStyle   !== undefined) row.visual_style    = data.visualStyle
  if (data.tone          !== undefined) row.tone            = data.tone
  if (data.audience      !== undefined) row.audience        = data.audience
  if (data.avoid         !== undefined) row.avoid           = data.avoid
  if (data.freqIg        !== undefined) row.freq_ig         = data.freqIg
  if (data.freqTt        !== undefined) row.freq_tt         = data.freqTt
  if (data.freqYt        !== undefined) row.freq_yt         = data.freqYt
  if (data.pipelines      !== undefined) row.pipelines        = data.pipelines
  if (data.accounts       !== undefined) row.accounts         = data.accounts
  if (data.postsGenerated !== undefined) row.posts_generated  = data.postsGenerated
  return row
}

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser()
  return user.id
}

// ── Store ─────────────────────────────────────────────────────────────────────
export const Store = {
  async getAll() {
    const { data, error } = await supabase
      .from('influencers')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) throw error
    return data.map(fromDb)
  },

  async get(id) {
    const { data, error } = await supabase
      .from('influencers')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return null
    return fromDb(data)
  },

  async create(data) {
    const userId = await getUserId()
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    const row = {
      id,
      user_id:         userId,
      name:            data.name,
      niche:           data.niche           || '',
      status:          data.status          || 'active',
      color:           data.color           || '#2563EB',
      platforms:       data.platforms       || [],
      ref_images:      data.refImages       || [],
      personality:     data.personality     || '',
      visual_style:    data.visualStyle     || '',
      tone:            data.tone            || '',
      audience:        data.audience        || '',
      avoid:           data.avoid           || '',
      freq_ig:         data.freqIg          || '',
      freq_tt:         data.freqTt          || '',
      freq_yt:         data.freqYt          || '',
      pipelines:       data.pipelines       || [],
      posts_generated: data.postsGenerated  || 0,
    }
    const { data: created, error } = await supabase
      .from('influencers')
      .insert(row)
      .select()
      .single()
    if (error) throw error
    return fromDb(created)
  },

  async update(id, patch) {
    const { data, error } = await supabase
      .from('influencers')
      .update({ ...toDb(patch), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return fromDb(data)
  },

  async delete(id) {
    const { error } = await supabase.from('influencers').delete().eq('id', id)
    if (error) throw error
  },

  resizeToBase64(file) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        const MAX = 480
        let w = img.width, h = img.height
        if (w > MAX || h > MAX) {
          if (w >= h) { h = Math.round(h * MAX / w); w = MAX }
          else        { w = Math.round(w * MAX / h); h = MAX }
        }
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        URL.revokeObjectURL(url)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = reject
      img.src = url
    })
  },
}
