const LLM_MODELS = [
  { value: 'gemini-2.0-flash',      label: 'Gemini 2.0 Flash (fast)' },
  { value: 'gemini-2.0-flash-thinking-exp', label: 'Gemini 2.0 Flash Thinking' },
  { value: 'gemini-1.5-pro',        label: 'Gemini 1.5 Pro (quality)' },
  { value: 'gemini-1.5-flash',      label: 'Gemini 1.5 Flash' },
]

const IMAGE_MODELS = [
  { value: 'gemini-2.0-flash-preview-image-generation', label: 'Nano Banana 2 (fast)' },
  { value: 'imagen-3.0-generate-002',                   label: 'Imagen 3 (quality)' },
]

const ASPECT_RATIOS = ['1:1','9:16','16:9','4:5','3:4','2:3']

function Field({ label, hint, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f' }}>{label}</label>
        {hint && <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 1 }}>{hint}</div>}
      </div>
      {children}
    </div>
  )
}

function TriggerConfig({ config, onChange }) {
  return (
    <Field label="Initial Input" hint="Optional starting text passed to downstream nodes as {{nodeId.output}}">
      <textarea
        className="form-textarea"
        value={config.input || ''}
        onChange={e => onChange({ ...config, input: e.target.value })}
        placeholder="Leave empty or type a starting prompt / topic..."
        style={{ minHeight: 80 }}
      />
    </Field>
  )
}

function LLMConfig({ config, onChange }) {
  return (
    <>
      <Field label="Model">
        <select className="form-select" value={config.model || 'gemini-2.0-flash'} onChange={e => onChange({ ...config, model: e.target.value })}>
          {LLM_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </Field>
      <Field label="System Prompt" hint="Role / persona instructions">
        <textarea
          className="form-textarea"
          value={config.systemPrompt || ''}
          onChange={e => onChange({ ...config, systemPrompt: e.target.value })}
          placeholder="You are a creative social media writer for a virtual influencer..."
          style={{ minHeight: 80 }}
        />
      </Field>
      <Field label="User Prompt" hint="Use {{nodeId.output}} to reference upstream results">
        <textarea
          className="form-textarea"
          value={config.prompt || ''}
          onChange={e => onChange({ ...config, prompt: e.target.value })}
          placeholder="Write a caption for: {{trigger-1.output}}"
          style={{ minHeight: 100 }}
        />
      </Field>
    </>
  )
}

function ImageGenConfig({ config, onChange }) {
  return (
    <>
      <Field label="Model">
        <select className="form-select" value={config.model || 'gemini-2.0-flash-preview-image-generation'} onChange={e => onChange({ ...config, model: e.target.value })}>
          {IMAGE_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </Field>
      <Field label="Prompt" hint="Use {{nodeId.output}} to chain from an LLM node">
        <textarea
          className="form-textarea"
          value={config.prompt || ''}
          onChange={e => onChange({ ...config, prompt: e.target.value })}
          placeholder="{{llm-1.output}}, photorealistic, cinematic lighting, 4k"
          style={{ minHeight: 100 }}
        />
      </Field>
      <Field label="Aspect Ratio">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {ASPECT_RATIOS.map(r => (
            <button
              key={r}
              type="button"
              onClick={() => onChange({ ...config, aspectRatio: r })}
              style={{
                padding: '5px 11px', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                border: '1.5px solid',
                borderColor: (config.aspectRatio || '9:16') === r ? '#0071e3' : 'var(--border)',
                background: (config.aspectRatio || '9:16') === r ? '#e8f1fd' : 'var(--surface2)',
                color: (config.aspectRatio || '9:16') === r ? '#0071e3' : 'var(--text-muted)',
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </Field>
    </>
  )
}

export default function ConfigPanel({ node, onChange, onDelete }) {
  const config = node.data.config || {}

  const typeLabels = { trigger: 'Trigger', llm: 'LLM Call', image_gen: 'Image Gen' }
  const typeAccents = { trigger: '#6366f1', llm: '#0071e3', image_gen: '#7c3aed' }

  return (
    <div style={{
      width: 300, flexShrink: 0,
      background: 'white', borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 18px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: typeAccents[node.type] || '#8e8e93',
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{typeLabels[node.type] || node.type}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>id: {node.id}</div>
        </div>
      </div>

      {/* Label */}
      <div style={{ padding: '14px 18px 0' }}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f', display: 'block', marginBottom: 5 }}>Label</label>
          <input
            className="form-input"
            value={node.data.label || ''}
            onChange={e => onChange({ ...config }, e.target.value)}
            placeholder="Node label"
          />
        </div>
      </div>

      {/* Config */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px' }}>
        {node.type === 'trigger'   && <TriggerConfig  config={config} onChange={onChange} />}
        {node.type === 'llm'       && <LLMConfig       config={config} onChange={onChange} />}
        {node.type === 'image_gen' && <ImageGenConfig  config={config} onChange={onChange} />}
      </div>

      {/* Delete */}
      {node.type !== 'trigger' && (
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-danger btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={onDelete}>
            Delete Node
          </button>
        </div>
      )}
    </div>
  )
}
