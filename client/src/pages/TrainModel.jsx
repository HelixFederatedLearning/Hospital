import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken, uploadTrainingBatch } from '../lib/api'
import './train-model.css'

import { trainNow } from '../lib/api'  // <- add this import
const CLASSES = ['No_DR', 'Mild', 'Moderate', 'Severe', 'Proliferative_DR']



export default function TrainModel() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([]) // {file,url,name,classLabel,confidence,sizeBytes,mimeType}
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => { if (!getToken()) navigate('/login') }, [])

  function onFiles(e) {
    const files = Array.from(e.target.files || [])
    const add = files.slice(0, Math.max(0, 10 - rows.length)).map(file => ({
      file, url: URL.createObjectURL(file), name: file.name,
      classLabel: '', confidence: 0.9, sizeBytes: file.size, mimeType: file.type || ''
    }))
    setRows(prev => [...prev, ...add]); e.target.value = ''
  }
  function removeAt(i) {
    setRows(prev => { const cp=[...prev]; if (cp[i]?.url) URL.revokeObjectURL(cp[i].url); cp.splice(i,1); return cp })
  }
  function clearAll() { rows.forEach(r=>r.url&&URL.revokeObjectURL(r.url)); setRows([]) }

  // async function submitTraining() {
  //   if (!rows.length) return setToast('Please add images')
  //   if (rows.some(r => !r.classLabel)) return setToast('Set class for each image')
  //   setBusy(true)
  //   try {
  //     const files = rows.map(r => r.file)
  //     const items = rows.map(r => ({ originalName: r.name, classLabel: r.classLabel, confidence: Number(r.confidence) }))
  //     const res = await uploadTrainingBatch({ files, items })
  //     setToast(`Queued ${res.saved} samples for training`)
  //   } catch (e) {
  //     setToast(e?.response?.data?.error || e?.message || 'Upload failed')
  //   } finally {
  //     setBusy(false); setTimeout(()=>setToast(''), 1800)
  //   }
  // }
  async function submitTraining() {
    if (!rows.length) return setToast('Please add images')
    if (rows.some(r => !r.classLabel)) return setToast('Set class for each image')
    setBusy(true)
    try {
      const files = rows.map(r => r.file)
      const items = rows.map(r => ({ originalName: r.name, classLabel: r.classLabel, confidence: Number(r.confidence) }))
      const res = await uploadTrainingBatch({ files, items })
      let msg = `Queued ${res.saved} samples. `

      // Immediately start local training + send delta to central
      const trig = await trainNow()
      if (trig?.ok) {
        msg += `Trained on ${trig.used} sample(s) and posted delta to central.`
      } else if (trig?.skipped) {
        msg += `Training skipped: ${trig.reason || 'not enough data'}.`
      } else {
        msg += `Training did not report success.`
      }

      setToast(msg)
      // Clear the table only if upload+train succeeded
      setRows([])
    } catch (e) {
      setToast(e?.response?.data?.error || e?.message || 'Upload failed')
    } finally {
      setBusy(false); setTimeout(()=>setToast(''), 2500)
    }
  }
  return (
    <div>
      <div className="tm-header">
        <div>
          <h1 className="tm-title">Train Model</h1>
          <p className="tm-badge">Provide the correct class and your confidence for each image, then click <b>Train Model</b>.</p>
        </div>
        <div className="tm-actions">
          <button className="btn" disabled={busy || rows.length===0} onClick={submitTraining}>
            {busy ? 'Uploading…' : 'Train Model'}
          </button>
          <button className="btn-secondary" onClick={clearAll} disabled={busy}>Clear</button>
        </div>
      </div>

      <div className="card-panel tm-toolbar">
        <div className="tm-controls">
          <input type="file" multiple accept="image/*" onChange={onFiles} />
          <span className="tm-badge">Max 10 images</span>
        </div>
      </div>

      <div className="card-panel tm-table-wrap">
        <div className="tm-scroll">
          <table className="tm-table">
            <thead>
              <tr>
                <th>#</th><th></th><th>Filename</th><th>Class</th><th>Confidence</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx}>
                  <td>{idx+1}</td>
                  <td><img src={r.url} alt={r.name} className="tm-thumb" /></td>
                  <td className="tm-mono">{r.name}</td>
                  <td>
                    <select className="input" value={r.classLabel} onChange={e=>{
                      const v = e.target.value
                      setRows(prev => prev.map((x, i) => i===idx ? { ...x, classLabel: v } : x))
                    }}>
                      <option value="">Select class…</option>
                      {CLASSES.map((c,i)=>(<option key={i} value={c}>{c}</option>))}
                    </select>
                  </td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <input className="tm-slider" type="range" min="0" max="1" step="0.01"
                        value={r.confidence}
                        onChange={e=>{
                          const v = Number(e.target.value)
                          setRows(prev => prev.map((x, i) => i===idx ? { ...x, confidence: v } : x))
                        }}
                      />
                      <input className="input" style={{ width:90 }} type="number" min="0" max="1" step="0.01"
                        value={r.confidence}
                        onChange={e=>{
                          let v = Number(e.target.value)
                          if (Number.isNaN(v)) v = 0; if (v<0) v=0; if (v>1) v=1
                          setRows(prev => prev.map((x, i) => i===idx ? { ...x, confidence: v } : x))
                        }}
                      />
                    </div>
                  </td>
                  <td className="tm-actions">
                    <button className="btn-secondary btn-sm" onClick={()=>removeAt(idx)} disabled={busy}>Remove</button>
                  </td>
                </tr>
              ))}
              {rows.length===0 && <tr><td colSpan="6" className="tm-badge">No images yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
