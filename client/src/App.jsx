import React, { useEffect, useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { getToken, clearToken } from './lib/api'

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()

  // initialize from current token to avoid header flash
  const [authed, setAuthed] = useState(() => !!getToken())

  useEffect(() => {
    setAuthed(!!getToken())
  }, [location.pathname])

  useEffect(() => {
    const onAuthChanged = () => setAuthed(!!getToken())
    const onStorage = (e) => {
      if (e.key === 'token' || e.key === 'token_session') onAuthChanged()
    }
    window.addEventListener('auth:changed', onAuthChanged)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('auth:changed', onAuthChanged)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  function logout(e) {
    e.preventDefault()
    clearToken()
    setAuthed(false)
    navigate('/login')
  }

  return (
    <div>
      <div className="container">
        <nav className="navbar">
          <div style={{ fontWeight: 700 }}>DR Test</div>
          <div>
            {!authed ? (
              <>
                <Link to="/login" className={location.pathname==='/login'?'active':''}>Login</Link>
                <Link to="/signup" className={location.pathname==='/signup'?'active':''}>Sign up</Link>
              </>
            ) : (
              <>
                {/* Keep only Dashboard and Profile in the header */}
                <Link to="/dashboard" className={location.pathname==='/dashboard'?'active':''}>Dashboard</Link>
                <Link to="/profile" className={location.pathname==='/profile'?'active':''}>Profile</Link>
                {/* No link to Model Testing here — it stays accessible via the Dashboard card */}
                {/* If you previously added Train Model here and want it hidden too, remove that link as well. */}
                <a href="#" onClick={logout} className="active">Logout</a>
              </>
            )}
          </div>
        </nav>
        <Outlet />
      </div>
    </div>
  )
}
