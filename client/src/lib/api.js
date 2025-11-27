import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api'

const LTK = 'token'
const STK = 'token_session'

function setAuthHeader(token) {
  if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  else delete axios.defaults.headers.common['Authorization']
}

export function getToken() {
  return localStorage.getItem(LTK) || sessionStorage.getItem(STK)
}

function notifyAuth() {
  window.dispatchEvent(new CustomEvent('auth:changed', { detail: { token: getToken() } }))
}

export function setToken(token, { remember = true } = {}) {
  if (token) {
    if (remember) {
      localStorage.setItem(LTK, token)
      sessionStorage.removeItem(STK)
    } else {
      sessionStorage.setItem(STK, token)
      localStorage.removeItem(LTK)
    }
    setAuthHeader(token)
    notifyAuth()
  } else {
    clearToken()
  }
}

export function clearToken() {
  localStorage.removeItem(LTK)
  sessionStorage.removeItem(STK)
  setAuthHeader(null)
  notifyAuth()
}

export function initAuth() {
  const token = getToken()
  if (token) setAuthHeader(token)
  return token
}

// ---- API calls ----
export async function login(hospitalId, password) {
  const { data } = await axios.post(`${API_BASE}/auth/login`, { hospitalId, password })
  return data
}
export async function signup(payload) {
  const { data } = await axios.post(`${API_BASE}/auth/signup`, payload)
  return data
}
export async function getDashboard() {
  const { data } = await axios.get(`${API_BASE}/doctor/dashboard`)
  return data
}
export async function getMyProfile() {
  const { data } = await axios.get(`${API_BASE}/doctor/me`)
  return data
}
export async function updateMyProfile(patch) {
  const { data } = await axios.put(`${API_BASE}/doctor/me`, patch)
  return data
}
export async function savePredictions(items) {
  const { data } = await axios.post(`${API_BASE}/doctor/predictions`, { items })
  return data
}
export async function uploadTrainingBatch({ files, items }) {
  // items: [{ originalName, classLabel, confidence (0..1) }]
  const form = new FormData();
  files.forEach(f => form.append('files', f));
  form.append('meta', JSON.stringify(items));
  const { data } = await axios.post(`${API_BASE}/doctor/train/upload`, form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}

export async function trainNow() {
  const { data } = await axios.post(`${API_BASE}/doctor/fl/train-now`);
  return data; // { ok, used, posted, ... } or { skipped, reason }
}