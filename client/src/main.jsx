import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import ModelTesting from './pages/ModelTesting'
import TrainModel from './pages/TrainModel'
import './styles.css'
import { initAuth } from './lib/api'

initAuth()

const root = createRoot(document.getElementById('root'))
root.render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />}>
        <Route index element={<Navigate to="/login" replace />} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="model-testing" element={<ModelTesting />} />
        <Route path="train-model" element={<TrainModel />} />
      </Route>
    </Routes>
  </BrowserRouter>
)
