import mongoose from 'mongoose';
const { Schema } = mongoose;

const doctorSchema = new Schema({
  userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  hospitalId: { type: String, required: true, unique: true },
  name:       { type: String, required: true },
  clinicId:   { type: String },
  specialty:  { type: String, default: 'Ophthalmology' },
  phone:      { type: String },
  active:     { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Doctor', doctorSchema);
