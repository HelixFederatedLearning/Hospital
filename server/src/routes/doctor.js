import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import Doctor from '../models/Doctor.js';
import Prediction from '../models/Prediction.js';
import User from '../models/User.js';

import multer from 'multer';
import fs from 'fs';
import path from 'path';
import TrainSample from '../models/TrainSample.js';

const router = express.Router();

// ---------- Upload storage (for training images) ----------
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'training');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, Date.now() + '__' + safe);
  }
});
const upload = multer({ storage, limits: { files: 10, fileSize: 20 * 1024 * 1024 } });

// ---------- Dashboard cards ----------
router.get('/dashboard', requireAuth, async (_req, res) => {
  res.json({
    cards: [
      { key: 'modelTesting', title: 'Model Testing', description: 'Run predictions on retinal images' },
      { key: 'trainModel',   title: 'Train Model',   description: 'Launch or monitor training jobs' },
      { key: 'profile',      title: 'Doctor Profile',description: 'View or update your profile' }
    ]
  });
});

// ---------- My profile (auto-create if missing) ----------
router.get('/me', requireAuth, async (req, res) => {
  let doc = await Doctor.findOne({ userId: req.user.sub })
    .select('_id hospitalId name clinicId specialty phone active createdAt updatedAt');

  if (!doc) {
    const user = await User.findById(req.user.sub).select('hospitalId name');
    if (!user) return res.status(404).json({ error: 'User not found' });

    doc = await Doctor.create({
      userId: user._id,
      hospitalId: user.hospitalId,
      name: user.name || user.hospitalId,
      specialty: 'Ophthalmology',
      active: true
    });

    doc = await Doctor.findById(doc._id)
      .select('_id hospitalId name clinicId specialty phone active createdAt updatedAt');
  }
  res.json({ doctor: doc });
});

router.put('/me', requireAuth, async (req, res) => {
  const { name, clinicId, specialty, phone } = req.body;
  const user = await User.findById(req.user.sub).select('hospitalId name');

  const doc = await Doctor.findOneAndUpdate(
    { userId: req.user.sub },
    {
      $set: { name, clinicId, specialty, phone },
      $setOnInsert: {
        userId: req.user.sub,
        hospitalId: user?.hospitalId,
        name: name || user?.name || user?.hospitalId,
        specialty: specialty || 'Ophthalmology',
        active: true
      }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).select('_id hospitalId name clinicId specialty phone active createdAt updatedAt');

  res.json({ doctor: doc });
});

// ---------- Save predictions (from Model Testing) ----------
router.post('/predictions', requireAuth, async (req, res) => {
  try {
    const { items } = req.body; // [{filename, doctorClass, modelClass, confidence, sizeBytes, mimeType, meta}]
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items is required' });
    }
    const doctor = await Doctor.findOne({ userId: req.user.sub }).select('_id');
    const docs = items.map(it => ({
      userId: req.user.sub,
      doctorId: doctor?._id,
      filename: it.filename,
      doctorClass: it.doctorClass || null,
      modelClass: it.modelClass,
      confidence: Number(it.confidence ?? 0),
      sizeBytes: it.sizeBytes || null,
      mimeType: it.mimeType || null,
      meta: it.meta || {}
    }));
    const inserted = await Prediction.insertMany(docs, { ordered: false });
    return res.json({ ok: true, saved: inserted.length });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ---------- NEW: Upload training images + metadata ----------
router.post('/train/upload', requireAuth, upload.array('files', 10), async (req, res) => {
  try {
    const meta = JSON.parse(req.body.meta || '[]'); // [{originalName, classLabel, confidence}]
    if (!Array.isArray(meta) || meta.length === 0) {
      return res.status(400).json({ error: 'meta array is required' });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'no files provided' });
    }

    const doctor = await Doctor.findOne({ userId: req.user.sub }).select('_id');
    const byName = new Map(meta.map(m => [m.originalName, m]));
    const docs = [];

    for (const f of req.files) {
      const m = byName.get(f.originalname);
      if (!m) continue;
      docs.push({
        userId: req.user.sub,
        doctorId: doctor?._id || null,
        filename: f.originalname,
        classLabel: String(m.classLabel || '').trim(),
        confidence: Number(m.confidence ?? 0),
        path: f.path,
        mimeType: f.mimetype,
        sizeBytes: f.size,
        status: 'queued',
        meta: m.meta || {}
      });
    }

    if (docs.length === 0) return res.status(400).json({ error: 'no files matched metadata' });
    const saved = await TrainSample.insertMany(docs, { ordered: false });
    // TODO: enqueue background training job using these samples
    res.json({ ok: true, saved: saved.length });
  } catch (e) {
    console.error('train/upload failed:', e);
    res.status(500).json({ error: e.message });
  }
});

// ---------- Admin list (unchanged, optional) ----------
router.get('/list', requireAuth, requireRole('admin'), async (req, res) => {
  const { clinicId, q } = req.query;
  const filter = {};
  if (clinicId) filter.clinicId = clinicId;
  if (q) filter.$or = [{ hospitalId: new RegExp(q, 'i') }, { name: new RegExp(q, 'i') }];
  const docs = await Doctor.find(filter)
    .select('_id hospitalId name clinicId specialty active createdAt')
    .sort({ createdAt: -1 })
    .limit(100);
  res.json({ doctors: docs });
});

export default router;
