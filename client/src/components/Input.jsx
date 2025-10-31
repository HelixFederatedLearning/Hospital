import React from 'react'

export default function Input({ label, type='text', icon=null, ...props }) {
  return (
    <div>
      {label && <label className="small">{label}</label>}
      <div style={{ position:'relative', marginTop:6 }}>
        {icon && <span style={{ position:'absolute', left:10, top:10, opacity:.7 }}>{icon}</span>}
        <input className="input" type={type} {...props} style={{ paddingLeft: icon?34:12 }} />
      </div>
    </div>
  )
}
