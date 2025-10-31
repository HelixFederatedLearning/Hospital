import mongoose from 'mongoose';
const { Schema } = mongoose;

const predictionSchema = new Schema({
  userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  doctorId:    { type: Schema.Types.ObjectId, ref: 'Doctor' },
  filename:    { type: String, required: true },
  doctorClass: { type: String },
  modelClass:  { type: String, required: true },
  confidence:  { type: Number, required: true }, // 0..1
  sizeBytes:   { type: Number },
  mimeType:    { type: String },
  meta:        { type: Object }
}, { timestamps: true });

export default mongoose.model('Prediction', predictionSchema);
