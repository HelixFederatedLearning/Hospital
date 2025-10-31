import React from 'react'
export default function Toast({ message, type='info' }) {
  if (!message) return null
  const color = type==='success' ? '#16a34a' : type==='error' ? '#ef4444' : '#60a5fa'
  return <div className="toast" style={{ borderColor: color }}>{message}</div>
}
