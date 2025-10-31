import React from 'react'
export default function Card({ title, description, onClick }) {
  return (
    <div onClick={onClick} className="card-panel" style={{ cursor:'pointer', border:'1px solid #1f2937' }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <p className="small">{description}</p>
    </div>
  )
}
