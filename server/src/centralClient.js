// server/src/centralClient.js
import axios from 'axios';
import jwt from 'jsonwebtoken';
import FormData from 'form-data';
import fs from 'fs';

const CENTRAL_HTTP = process.env.CENTRAL_HTTP || 'http://localhost:8000'; // no /v1 here
const CENTRAL_BASE = `${CENTRAL_HTTP}/v1`;
const CENTRAL_USER = process.env.CENTRAL_USER || 'admin';
const CENTRAL_PASS = process.env.CENTRAL_PASS || 'admin';

let centralToken = null;

async function ensureCentralAuth() {
  if (centralToken) {
    try { jwt.decode(centralToken); return centralToken; } catch {}
  }
  const { data } = await axios.post(`${CENTRAL_BASE}/auth/login`, {
    username: CENTRAL_USER, password: CENTRAL_PASS
  });
  centralToken = data.access_token;
  return centralToken;
}

export async function getCurrentModelMeta() {
  const tok = await ensureCentralAuth();
  const { data } = await axios.get(`${CENTRAL_BASE}/models/current`, {
    headers: { Authorization: `Bearer ${tok}` }
  });
  return data; // {id, version, checksum, created_at, url}
}

export async function downloadCurrentModel(url, outPath) {
  const full = url.startsWith('http') ? url : `${CENTRAL_HTTP}${url}`;
  const r = await axios.get(full, { responseType: 'arraybuffer' });
  await fs.promises.writeFile(outPath, Buffer.from(r.data));
  return outPath;
}

export async function postDelta({ clientId, kind, numExamples, modelArch, sdKeysHash, filePath }) {
  const tok = await ensureCentralAuth();

  const form = new FormData();
  form.append('client_id', clientId);
  form.append('kind', kind); // 'hospital' | 'patient'
  form.append('num_examples', String(numExamples));
  if (modelArch) form.append('model_arch', modelArch);
  if (sdKeysHash) form.append('sd_keys_hash', sdKeysHash);
  form.append('delta', fs.createReadStream(filePath));

  const headers = { Authorization: `Bearer ${tok}`, ...form.getHeaders() };
  const { data } = await axios.post(`${CENTRAL_BASE}/deltas`, form, { headers });
  return data;
}
