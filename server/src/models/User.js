import mongoose from 'mongoose';
const { Schema } = mongoose;

const userSchema = new Schema({
  hospitalId: { type: String, required: true, unique: true },
  name:       { type: String, required: true },
  email:      { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['doctor', 'admin'], default: 'doctor' },
  clinicId: { type: String }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
