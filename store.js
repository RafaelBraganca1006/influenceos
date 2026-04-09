// ─── INFLUENCEOS STORE ────────────────────────────────────────────────────────
// Shared localStorage state for all pages.

const Store = {
  KEY: 'influeos_data',

  getAll() {
    try { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); }
    catch { return []; }
  },

  saveAll(arr) {
    localStorage.setItem(this.KEY, JSON.stringify(arr));
  },

  get(id) {
    return this.getAll().find(i => i.id === id) || null;
  },

  create(data) {
    const all = this.getAll();
    const inf = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      createdAt: new Date().toISOString(),
      postsGenerated: 0,
      pipelines: [],
      refImages: [],
      personality: '',
      visualStyle: '',
      tone: '',
      audience: '',
      avoid: '',
      freqIg: '',
      freqTt: '',
      freqYt: '',
      ...data,
    };
    all.push(inf);
    this.saveAll(all);
    return inf;
  },

  update(id, patch) {
    const all = this.getAll();
    const idx = all.findIndex(i => i.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...patch };
    this.saveAll(all);
    return all[idx];
  },

  delete(id) {
    this.saveAll(this.getAll().filter(i => i.id !== id));
  },

  // Resize + encode an image File to base64, max 480px, quality 0.82
  resizeToBase64(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const MAX = 480;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w >= h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = url;
    });
  },
};
