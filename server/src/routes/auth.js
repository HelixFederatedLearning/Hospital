import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';

const router = express.Router();

router.post('/signup', async (req, res) => {
  try {
    const { hospitalId, name, email, password, clinicId, specialty, phone } = req.body;
    if (!hospitalId || !email || !password) {
      return res.status(400).json({ error: 'hospitalId, email, password required' });
    }
    const exists = await User.findOne({ $or: [{ email }, { hospitalId }] });
    if (exists) return res.status(409).json({ error: 'User already exists' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      hospitalId,
      name: name || hospitalId,
      email,
      passwordHash,
      role: 'doctor',
      clinicId: clinicId || null
    });

    const doctor = await Doctor.create({
      userId: user._id,
      hospitalId,
      name: name || hospitalId,
      clinicId: clinicId || null,
      specialty: specialty || 'Ophthalmology',
      phone: phone || '',
      active: true
    });

    return res.status(201).json({
      ok: true,
      user: { id: user._id, hospitalId: user.hospitalId, email: user.email, role: user.role },
      doctor: { id: doctor._id, hospitalId: doctor.hospitalId, name: doctor.name }
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { hospitalId, password } = req.body;
    const user = await User.findOne({ hospitalId });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { sub: user._id, role: user.role, hospitalId: user.hospitalId },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    const doctor = await Doctor.findOne({ userId: user._id })
      .select('_id hospitalId name clinicId specialty phone active');

    return res.json({
      token,
      user: { id: user._id, hospitalId: user.hospitalId, name: user.name, role: user.role },
      doctor
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
