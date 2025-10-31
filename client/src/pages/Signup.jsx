import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signup, login, setToken } from '../lib/api'
import Input from '../components/Input'
import Toast from '../components/Toast'

function strength(pw) {
  let s = 0
  if (pw.length >= 6) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[a-z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return Math.min(s, 5)
}

export default function Signup() {
  const [form, setForm] = useState({ hospitalId:'', name:'', email:'', password:'', confirm:'', clinicId:'', specialty:'Ophthalmology', phone:'' })
  const [agree, setAgree] = useState(false)
  const [show, setShow] = useState(false)
  const [toast, setToast] = useState('')
  const navigate = useNavigate()
  const s = strength(form.password)

  function onChange(e) { setForm({ ...form, [e.target.name]: e.target.value }) }

  async function onSubmit(e) {
    e.preventDefault()
    setToast('')
    if (!agree) return setToast('Please accept Terms and Privacy Policy')
    if (form.password !== form.confirm) return setToast('Passwords do not match')
    try {
      await signup({ hospitalId: form.hospitalId, name: form.name, email: form.email, password: form.password, clinicId: form.clinicId, specialty: form.specialty, phone: form.phone })
      const res = await login(form.hospitalId, form.password)
      setToken(res.token, { remember: true })
      navigate('/dashboard')
    } catch (e) {
      setToast(e?.response?.data?.error || 'Signup failed')
    }
  }

  return (
    <div style={{ display:'grid', placeItems:'center', minHeight: '80vh' }}>
      <form onSubmit={onSubmit} className="card-panel" style={{ width: 520 }}>
        <h2 style={{ marginTop:0 }}>Create account</h2>
        <p className="small">Sign up to get started</p>

        <div style={{ display:'grid', gap:12 }}>
          <Input label="Username" name="hospitalId" value={form.hospitalId} onChange={onChange} placeholder="your.username" icon="👤" />
          <Input label="Email" name="email" value={form.email} onChange={onChange} placeholder="you@example.com" icon="✉️" />
          <Input label="Full name" name="name" value={form.name} onChange={onChange} placeholder="Dr. Jane Doe" icon="🧑‍⚕️" />
          <div>
            <label className="small">Password (min 6 chars)</label>
            <div style={{ position:'relative', marginTop:6 }}>
              <span style={{ position:'absolute', left:10, top:10, opacity:.7 }}>🔑</span>
              <input className="input" type={show?'text':'password'} name="password" value={form.password} onChange={onChange} placeholder="••••••••" style={{ paddingLeft:34 }} />
              <button type="button" onClick={()=>setShow(!show)} style={{ position:'absolute', right:8, top:6, border:'none', background:'transparent', cursor:'pointer' }}>👁️</button>
            </div>
            <div style={{ height: 6, background: '#1f2937', borderRadius: 6, overflow: 'hidden', marginTop:8 }}>
              <div style={{ width: (s*20)+'%', height: '100%', background: s>=4 ? '#22c55e' : s>=2 ? '#f59e0b' : '#ef4444' }}></div>
            </div>
          </div>
          <Input label="Confirm password" type="password" name="confirm" value={form.confirm} onChange={onChange} placeholder="Repeat your password" icon="✅" />
          <Input label="Clinic ID" name="clinicId" value={form.clinicId} onChange={onChange} placeholder="CLINIC-001" icon="🏥" />
          <Input label="Specialty" name="specialty" value={form.specialty} onChange={onChange} placeholder="Ophthalmology" icon="🧪" />
          <Input label="Phone" name="phone" value={form.phone} onChange={onChange} placeholder="+91-..." icon="📞" />

          <label style={{ display:'flex', alignItems:'center', gap:8 }}>
            <input type="checkbox" checked={agree} onChange={e=>setAgree(e.target.checked)} />
            <span className="small">I agree to the <a className="link" href="#">Terms</a> and <a className="link" href="#">Privacy Policy</a></span>
          </label>

          <button className="btn" type="submit">Sign up</button>

          <p className="small" style={{ textAlign:'center' }}>
            Have an account? <Link className="link" to="/login">Log in</Link>
          </p>
        </div>
      </form>
      <Toast message={toast} type="error" />
    </div>
  )
}
