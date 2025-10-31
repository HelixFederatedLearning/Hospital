import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken, savePredictions } from '../lib/api'
import Toast from '../components/Toast'
import { useOnnxClient } from '../lib/useOnnxClient'
import './model-testing.css'

export default function ModelTesting() {
  const navigate = useNavigate()
  const { status, error, predictLocal, classes } = useOnnxClient()
  const [rows, setRows] = useState([]) // {file,url,name,doctorClass,pred,conf,running,sizeBytes,mimeType}
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!getToken()) navigate('/login')
  }, [])

  function onFiles(e) {
    const files = Array.from(e.target.files || [])
    const add = files.slice(0, Math.max(0, 10 - rows.length)).map(file => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      doctorClass: '',
      pred: null,
      conf: null,
      running: false,
      sizeBytes: file.size,
      mimeType: file.type || ''
    }))
    setRows(prev => [...prev, ...add])
    e.target.value = ''
  }

  function removeAt(i) {
    setRows(prev => {
      const cp = [...prev]
      if (cp[i]?.url) URL.revokeObjectURL(cp[i].url)
      cp.splice(i, 1)
      return cp
    })
  }

  async function predictOne(i) {
    if (status !== 'ready') { setToast('Model not ready'); return }
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, running: true } : r))
    try {
      const res = await predictLocal(rows[i].file) // sorted {label, prob}
      const top = res[0] || { label: '-', prob: 0 }
      setRows(prev => prev.map((r, idx) =>
        idx === i ? { ...r, pred: top.label, conf: (top.prob * 100).toFixed(1) + '%', running: false } : r
      ))
    } catch (e) {
      setRows(prev => prev.map((r, idx) => idx === i ? { ...r, running: false } : r))
      setToast('Prediction failed: ' + (e?.message || e))
    }
  }

  // Predict ALL rows sequentially (no saving here)
  async function predictAll() {
    if (status !== 'ready') { setToast('Model not ready'); return }
    if (!rows.length) { setToast('No images to predict'); return }
    setBusy(true)
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].pred && rows[i].conf) continue
      // eslint-disable-next-line no-await-in-loop
      await predictOne(i)
    }
    setBusy(false)
    setToast('Prediction completed')
    setTimeout(()=>setToast(''), 1500)
  }

  // Save all predicted rows to DB
  async function saveAll() {
    const items = rows
      .filter(r => r.pred && r.conf) // only rows with predictions
      .map(r => ({
        filename: r.name,
        doctorClass: r.doctorClass || null,
        modelClass: r.pred || null,
        confidence: r.conf ? Number(r.conf.replace('%',''))/100 : 0,
        sizeBytes: r.sizeBytes || null,
        mimeType: r.mimeType || null,
        meta: {}
      }))

    if (items.length === 0) { setToast('Nothing to save'); return }

    try {
      setBusy(true)
      const res = await savePredictions(items)
      setToast(`Saved ${res.saved} predictions`)
    } catch (e) {
      setToast('Save failed: ' + (e?.response?.data?.error || e?.message || e))
    } finally {
      setBusy(false)
      setTimeout(()=>setToast(''), 1800)
    }
  }

  function clearAll() {
    rows.forEach(r => r.url && URL.revokeObjectURL(r.url))
    setRows([])
  }

  return (
    <div>
      <div className="mt-header">
        <div>
          <h1 className="mt-title">Model Testing</h1>
          <p className="small">
            Status: <strong>{status}</strong>{error ? ' — ' + error.message : ''}. Upload up to 10 images.
          </p>
        </div>
        <div className="mt-actions">
          <button className="btn mt-predict-all"
                  disabled={busy || status!=='ready' || rows.length===0}
                  onClick={predictAll}>
            {busy ? 'Working…' : 'Predict All'}
          </button>
          <button className="btn-secondary"
                  disabled={busy}
                  onClick={saveAll}>
            Save
          </button>
        </div>
      </div>

      <div className="card-panel mt-toolbar">
        <div className="mt-controls">
          <input type="file" multiple accept="image/*" onChange={onFiles} />
          <button className="btn-secondary" onClick={clearAll}>Clear</button>
          <span className="small">Classes: {classes.join(', ')}</span>
        </div>
      </div>

      <div className="card-panel mt-table-wrap">
        <div className="table-scroll">
          <table className="mt-table">
            <thead>
              <tr>
                <th>#</th>
                <th></th>
                <th>Filename</th>
                <th>Doctor Opinion</th>
                <th>Model Prediction</th>
                <th>Confidence</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx}>
                  <td>{idx+1}</td>
                  <td><img src={r.url} alt={r.name} className="thumb" /></td>
                  <td className="mono">{r.name}</td>
                  <td>
                    <select className="input" value={r.doctorClass} onChange={e=>{
                      const v = e.target.value
                      setRows(prev => prev.map((x, i) => i===idx ? { ...x, doctorClass: v } : x))
                    }}>
                      <option value="">Select class…</option>
                      {classes.map((c,i)=>(<option key={i} value={c}>{c}</option>))}
                    </select>
                  </td>
                  <td>{r.running ? 'Running…' : (r.pred || '-')}</td>
                  <td>{r.conf || '-'}</td>
                  <td className="row-actions">
                    <button className="btn btn-sm" onClick={()=>predictOne(idx)} disabled={r.running || status!=='ready'}>Predict</button>
                    <button className="btn-secondary btn-sm" onClick={()=>removeAt(idx)}>Remove</button>
                  </td>
                </tr>
              ))}
              {rows.length===0 && (
                <tr><td colSpan="7" className="small muted">No images yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Toast message={toast} type={toast.includes('failed') ? 'error' : 'success'} />
    </div>
  )
}
