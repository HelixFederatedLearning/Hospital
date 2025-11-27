// import mongoose from 'mongoose';
// const { Schema } = mongoose;

// const trainSampleSchema = new Schema({
//   userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
//   doctorId:    { type: Schema.Types.ObjectId, ref: 'Doctor', index: true },
//   filename:    { type: String, required: true },
//   classLabel:  { type: String, required: true },
//   confidence:  { type: Number, required: true }, // 0..1
//   path:        { type: String, required: true }, // disk path to saved file
//   mimeType:    { type: String },
//   sizeBytes:   { type: Number },
//   status:      { type: String, enum: ['queued','used','skipped'], default: 'queued' },
//   meta:        { type: Object }
// }, { timestamps: true });

// export default mongoose.model('TrainSample', trainSampleSchema);

import mongoose from 'mongoose';
const { Schema } = mongoose;

const trainSampleSchema = new Schema({
  userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  doctorId:    { type: Schema.Types.ObjectId, ref: 'Doctor', index: true },

  // NEW: multi-hospital
  hospitalId:  { type: String, required: true, index: true },

  filename:    { type: String, required: true },
  classLabel:  { type: String, required: true },
  confidence:  { type: Number, required: true }, // 0..1
  path:        { type: String, required: true }, // disk path to saved file
  mimeType:    { type: String },
  sizeBytes:   { type: Number },
  status:      { type: String, enum: ['queued','used','skipped'], default: 'queued' },
  meta:        { type: Object }
}, { timestamps: true });

export default mongoose.model('TrainSample', trainSampleSchema);
