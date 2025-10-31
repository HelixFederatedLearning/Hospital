import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboard, getToken } from '../lib/api'
import Card from '../components/Card'

export default function Dashboard() {
  const [cards, setCards] = useState([])
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const t = getToken()
    if (!t) { navigate('/login'); return }
    getDashboard().then(d => setCards(d.cards)).catch(e => setError(e?.response?.data?.error || 'Failed to load'))
  }, [])

  function openCard(key) {
    if (key === 'modelTesting') navigate('/model-testing')
    if (key === 'trainModel') navigate('/train-model')
    if (key === 'profile') navigate('/profile')
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p className="small">Quick access</p>
      {error && <div style={{ color: '#fca5a5' }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, marginTop: 16 }}>
        {cards.map(c => (
          <Card key={c.key} title={c.title} description={c.description} onClick={() => openCard(c.key)} />
        ))}
      </div>
    </div>
  )
}
