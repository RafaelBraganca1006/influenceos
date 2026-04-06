// Instagram Looter 2 via RapidAPI
// https://rapidapi.com/irrors-apis/api/instagram-looter2
//
// Flow: GET /profile?username= returns profile data + 12 recent posts
// in edge_owner_to_timeline_media.edges — single API call, no separate posts endpoint needed.

const HOST = 'instagram-looter2.p.rapidapi.com'

async function get(path, apiKey) {
  const res = await fetch(`https://${HOST}${path}`, {
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': HOST,
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}${text ? ': ' + text.slice(0, 120) : ''}`)
  }
  return res.json()
}

export async function fetchInstagramData(username, apiKey) {
  const r = await get(`/profile?username=${encodeURIComponent(username)}`, apiKey)

  if (!r.status && r.errorMessage) {
    throw new Error(r.errorMessage)
  }

  const profile = {
    username:        r.username,
    full_name:       r.full_name,
    followers_count: r.edge_followed_by?.count ?? 0,
    following_count: r.edge_follow?.count ?? 0,
    media_count:     r.edge_owner_to_timeline_media?.count ?? 0,
    profile_pic_url: r.profile_pic_url_hd || r.profile_pic_url,
    is_verified:     r.is_verified ?? false,
  }

  const edges = r.edge_owner_to_timeline_media?.edges || []
  const media = edges.slice(0, 12).map(({ node }) => ({
    id:             node.id,
    media_type:     node.__typename === 'GraphVideo' ? 'VIDEO' : 'IMAGE',
    media_url:      node.display_url,
    thumbnail_url:  node.display_url,
    like_count:     node.edge_liked_by?.count ?? node.edge_media_preview_like?.count ?? 0,
    comments_count: node.edge_media_to_comment?.count ?? 0,
  }))

  return { profile, media }
}
