import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken, getMyProfile, updateMyProfile } from '../lib/api'
import Input from '../components/Input'
import Toast from '../components/Toast'

export default function Profile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!getToken()) { navigate('/login'); return }
    (async () => {
      setLoading(true)
      try {
        const d = await getMyProfile()
        setProfile(d.doctor)
      } catch (e) {
        setToast(e?.response?.data?.error || 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function save() {
    setToast('')
    try {
      const { doctor } = await updateMyProfile({
        name: profile.name,
        clinicId: profile.clinicId,
        specialty: profile.specialty,
        phone: profile.phone
      })
      setProfile(doctor)
      setToast('Saved')
      setTimeout(()=>setToast(''), 1500)
    } catch (e) {
      setToast(e?.response?.data?.error || 'Save failed')
    }
  }

  if (loading) return <div>Loading...</div>

  if (!profile) {
    return (
      <div>
        <h1>Doctor Profile</h1>
        <div className="card-panel" style={{ maxWidth: 560 }}>
          <p className="small">Profile not found. Click “Create” to initialize.</p>
          <button className="btn" onClick={()=>{
            setProfile({ hospitalId:'', name:'', clinicId:'', specialty:'Ophthalmology', phone:'' })
          }}>Create</button>
        </div>
        <Toast message={toast} type="error" />
      </div>
    )
  }

  return (
    <div>
      <h1>Doctor Profile</h1>
      <div className="card-panel" style={{ maxWidth: 560 }}>
        <div style={{ display:'grid', gap: 12 }}>
          <Input label="Hospital ID" value={profile.hospitalId || ''} disabled />
          <Input label="Name" value={profile.name || ''} onChange={e=>setProfile({ ...profile, name:e.target.value })} />
          <Input label="Clinic ID" value={profile.clinicId || ''} onChange={e=>setProfile({ ...profile, clinicId:e.target.value })} />
          <Input label="Specialty" value={profile.specialty || ''} onChange={e=>setProfile({ ...profile, specialty:e.target.value })} />
          <Input label="Phone" value={profile.phone || ''} onChange={e=>setProfile({ ...profile, phone:e.target.value })} />
          <div><button onClick={save} className="btn">Save</button></div>
        </div>
      </div>
      <Toast message={toast} type={toast==='Saved'?'success':'info'} />
    </div>
  )
}
