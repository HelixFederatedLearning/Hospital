import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login, setToken, getToken } from '../lib/api'
import Input from '../components/Input'
import Toast from '../components/Toast'

export default function Login() {
  const [hospitalId, setHospitalId] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(true)
  const [toast, setToast] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const t = getToken()
    if (t) navigate('/dashboard')
  }, [])

  async function onSubmit(e) {
    e.preventDefault()
    setToast('')
    try {
      const res = await login(hospitalId, password)
      setToken(res.token, { remember }) // ← persist across refresh
      navigate('/dashboard')
    } catch (e) {
      setToast(e?.response?.data?.error || 'Login failed')
    }
  }

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '80vh' }}>
      <form onSubmit={onSubmit} className="card-panel" style={{ width: 460 }}>
        <h2 style={{ margin: 0 }}>Welcome back</h2>
        <p className="small">Sign in to continue</p>

        <div style={{ display:'grid', gap:12, marginTop: 8 }}>
          <Input label="Username" value={hospitalId} onChange={e=>setHospitalId(e.target.value)}
            placeholder="e.g. DR-001" icon="👤" />
          <div>
            <label className="small">Password</label>
            <div style={{ position:'relative', marginTop:6 }}>
              <span style={{ position:'absolute', left:10, top:10, opacity:.7 }}>🔑</span>
              <input className="input" type={show?'text':'password'} value={password}
                     onChange={e=>setPassword(e.target.value)} placeholder="••••••••" style={{ paddingLeft:34 }} />
              <button type="button" onClick={()=>setShow(!show)} style={{ position:'absolute', right:8, top:6, border:'none', background:'transparent', cursor:'pointer' }}>👁️</button>
            </div>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <label style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} />
              <span className="small">Remember me</span>
            </label>
            <a className="link small" href="#">Forgot password?</a>
          </div>

          <button className="btn" type="submit">Sign in</button>

          <p className="small" style={{ textAlign:'center' }}>
            No account? <Link className="link" to="/signup">Sign up</Link>
          </p>
        </div>
      </form>
      <Toast message={toast} type="error" />
    </div>
  )
}
