import { useEffect, useRef, useState } from 'react'
import * as ort from 'onnxruntime-web'
import { set, get, del } from 'idb-keyval'

// One-time after npm i: npm run prepare:ort (copies WASM to /public/ort)
ort.env.wasm.wasmPaths = '/ort/'
ort.env.wasm.numThreads = 1
ort.env.wasm.proxy = false
ort.env.wasm.simd = true

const CLASSES = ['No_DR', 'Mild', 'Moderate', 'Severe', 'Proliferative_DR']
const MODEL_URL = import.meta.env.VITE_MODEL_URL
const INPUT_NAME = import.meta.env.VITE_MODEL_INPUT || 'input'
const OUTPUT_NAME = import.meta.env.VITE_MODEL_OUTPUT || 'output'
const SIZE = 224

function softmax(arr) {
  const max = Math.max(...arr)
  const exps = arr.map(v => Math.exp(v - max))
  const sum = exps.reduce((a, b) => a + b, 0)
  return exps.map(v => v / sum)
}
const isArrayBuffer = v => v instanceof ArrayBuffer
const isUint8Array = v => v instanceof Uint8Array
const toUint8Array = v => (isUint8Array(v) ? v : isArrayBuffer(v) ? new Uint8Array(v) : null)

function hwcToNchw(data) {
  const chw = new Float32Array(3 * SIZE * SIZE)
  const channelSize = SIZE * SIZE
  let iSrc = 0
  for (let i = 0; i < SIZE * SIZE; i++) {
    const r = data[iSrc++] / 255
    const g = data[iSrc++] / 255
    const b = data[iSrc++] / 255
    iSrc++
    chw[i] = r
    chw[i + channelSize] = g
    chw[i + 2 * channelSize] = b
  }
  return new ort.Tensor('float32', chw, [1, 3, SIZE, SIZE])
}

async function imageToNCHWTensor(file) {
  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    const url = URL.createObjectURL(file)
    try {
      const img = await new Promise((res, rej) => {
        const im = new Image()
        im.onload = () => res(im)
        im.onerror = rej
        im.src = url
      })
      const canvas = document.createElement('canvas')
      canvas.width = SIZE; canvas.height = SIZE
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(img, 0, 0, SIZE, SIZE)
      const { data } = ctx.getImageData(0, 0, SIZE, SIZE)
      URL.revokeObjectURL(url)
      return hwcToNchw(data)
    } catch (e) {
      URL.revokeObjectURL(url)
      throw e
    }
  }

  const canvas = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(SIZE, SIZE)
    : (() => { const c = document.createElement('canvas'); c.width = SIZE; c.height = SIZE; return c })();

  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(bitmap, 0, 0, SIZE, SIZE)
  const { data } = ctx.getImageData(0, 0, SIZE, SIZE)
  return hwcToNchw(data)
}

export function useOnnxClient() {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const sessionRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setStatus('loading')
        if (!MODEL_URL) throw new Error('VITE_MODEL_URL is not set')

        try {
          const s1 = await ort.InferenceSession.create(MODEL_URL, {
            executionProviders: ['wasm'],
            graphOptimizationLevel: 'all'
          })
          if (cancelled) return
          sessionRef.current = s1
          setStatus('ready')
          return
        } catch (eUrl) {
          console.warn('[ORT] URL session failed, trying buffer:', eUrl?.message || eUrl)
        }

        let buf = null
        let cached = await get(MODEL_URL)
        if (cached) {
          const arr = toUint8Array(cached)
          if (arr) buf = arr
          else await del(MODEL_URL)
        }
        if (!buf) {
          const r = await fetch(MODEL_URL, { cache: 'force-cache' })
          if (!r.ok) {
            const txt = await r.text().catch(() => '')
            throw new Error(`Fetch failed: ${r.status} ${r.statusText} — ${txt.slice(0, 200)}`)
          }
          const ab = await r.arrayBuffer()
          await set(MODEL_URL, ab)
          buf = new Uint8Array(ab)
        }

        const s2 = await ort.InferenceSession.create(buf, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all'
        })
        if (cancelled) return
        sessionRef.current = s2
        setStatus('ready')
      } catch (e) {
        setError(e)
        setStatus('error')
      }
    })()
    return () => { cancelled = true }
  }, [])

  async function predictLocal(file) {
    if (!sessionRef.current) throw new Error('Model not ready')
    if (!file) throw new Error('No file provided')
    const tensor = await imageToNCHWTensor(file)
    const out = await sessionRef.current.run({ [INPUT_NAME]: tensor })
    const output = out[OUTPUT_NAME]
    const logits = Array.from(output.data)
    const probs = softmax(logits)
    return CLASSES.map((label, i) => ({ label, prob: probs[i] ?? 0 }))
      .sort((a, b) => b.prob - a.prob)
  }

  return { status, error, predictLocal, classes: CLASSES, size: SIZE }
}
