// // server/src/worker.js
// import path from 'path';
// import fs from 'fs';
// import { spawn } from 'child_process';
// import TrainSample from './models/TrainSample.js';
// import { fileURLToPath } from 'url';
// import Doctor from './models/Doctor.js';
// import { getCurrentModelMeta, downloadCurrentModel, postDelta } from './centralClient.js';

// const __dirname = path.dirname(fileURLToPath(import.meta.url));


// const MIN_BATCH = Number(process.env.FL_MIN_BATCH || 10);
// const TICK_MS   = Number(process.env.FL_TICK_MS || 15000);
// const TMP_DIR   = process.env.FL_TMP_DIR || path.join(process.cwd(), 'fl', 'tmp');
// const PY_BIN    = process.env.FL_PYTHON || 'python';
// const TRAIN_PY  = process.env.FL_TRAIN_SCRIPT || path.join(process.cwd(), 'fl', 'train_and_diff.py');
// const MODEL_ARCH = process.env.FL_MODEL_ARCH || 'tv_effnet_b3';
// const SD_KEYS_HASH = process.env.FL_SD_KEYS_HASH || 'v1';

// fs.mkdirSync(TMP_DIR, { recursive: true });

// function runPython(bin, script, args) {
//   return new Promise((resolve, reject) => {
//     const p = spawn(bin, [script, ...args], { stdio: 'inherit' });
//     p.on('exit', code => code === 0 ? resolve() : reject(new Error(`python exit ${code}`)));
//   });
// }
// export async function trainNowForHospital(hospitalId) {
//   if (!hospitalId) throw new Error('hospitalId required');
//   // reuse the same internals as the loop
//   return await (async function trainForHospitalDirect() {
//     // (copy of trainForHospital without MIN_BATCH guard, or keep it)
//     // If you want to keep the minimum, leave the early return.
//     // Here we’ll allow running even with small batches:
//     const queued = await TrainSample.find({ hospitalId, status: 'queued' }).sort({ createdAt: 1 });
//     if (queued.length === 0) return { skipped: true, reason: 'no_samples', hospitalId };

//     const meta = await getCurrentModelMeta();
//     const gPath = path.join(TMP_DIR, `${hospitalId}__global.pth`);
//     await downloadCurrentModel(meta.url, gPath);

//     const files = queued.map(s => s.path);
//     const labels = queued.map(s => s.classLabel);
//     const deltaPath = path.join(TMP_DIR, `${hospitalId}__delta.pt`);

//     await runPython(PY_BIN, TRAIN_PY, [
//       '--global', gPath,
//       '--images', ...files,
//       '--labels', ...labels,
//       '--out', deltaPath,
//       '--kind', 'hospital'
//     ]);

//     await postDelta({
//       clientId: hospitalId,
//       kind: 'hospital',
//       numExamples: files.length,
//       modelArch: MODEL_ARCH,
//       sdKeysHash: SD_KEYS_HASH,
//       filePath: deltaPath
//     });

//     await TrainSample.updateMany({ _id: { $in: queued.map(s => s._id) } }, { $set: { status: 'used' } });

//     return { ok: true, hospitalId, used: queued.length, posted: true };
//   })();
// }


// // async function trainForHospital(hospitalId) {
// //   // queue for this hospital
// //   const queued = await TrainSample.find({ hospitalId, status: 'queued' }).sort({ createdAt: 1 }).limit(MIN_BATCH);
// //   if (queued.length < MIN_BATCH) {
// //     return { skipped: true, hospitalId, reason: 'not_enough_samples', queued: queued.length };
// //   }

// //   // fetch current global model
// //   const meta = await getCurrentModelMeta();
// //   const gPath = path.join(TMP_DIR, `${hospitalId}__global.pth`);
// //   await downloadCurrentModel(meta.url, gPath);

// //   const files = queued.map(s => s.path);
// //   const labels = queued.map(s => s.classLabel);
// //   const deltaPath = path.join(TMP_DIR, `${hospitalId}__delta.pt`);

// //   // call python to fine-tune + write delta
// //   await runPython(PY_BIN, TRAIN_PY, [
// //     '--global', gPath,
// //     '--images', ...files,
// //     '--labels', ...labels,
// //     '--out', deltaPath,
// //     '--kind', 'hospital'
// //   ]);

// //   await postDelta({
// //     clientId: hospitalId,
// //     kind: 'hospital',
// //     numExamples: files.length,
// //     modelArch: MODEL_ARCH,
// //     sdKeysHash: SD_KEYS_HASH,
// //     filePath: deltaPath
// //   });

// //   await TrainSample.updateMany({ _id: { $in: queued.map(s => s._id) } }, { $set: { status: 'used' } });

// //   return { ok: true, hospitalId, used: queued.length };
// // }

// export async function workerTick() {
//   // find hospitals that have any queued samples
//   const groups = await TrainSample.aggregate([
//     { $match: { status: 'queued' } },
//     { $group: { _id: '$hospitalId', cnt: { $sum: 1 } } }
//   ]);

//   const results = [];
//   for (const g of groups) {
//     const hospitalId = g._id;
//     if (!hospitalId) continue; // data hygiene
//     try {
//       const out = await trainForHospital(hospitalId);
//       results.push(out);
//     } catch (e) {
//       results.push({ ok: false, hospitalId, error: e.message });
//     }
//   }
//   return results;
// }

// // simple interval loop
// export function startWorkerLoop() {
//   setInterval(() => { workerTick().catch(()=>{}) }, TICK_MS);
//   console.log(`[FL] worker loop started @ ${TICK_MS} ms`);
// }

// server/src/worker.js
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import TrainSample from './models/TrainSample.js';
import { getCurrentModelMeta, downloadCurrentModel, postDelta } from './centralClient.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MIN_BATCH   = Number(process.env.FL_MIN_BATCH || 10);
const TICK_MS     = Number(process.env.FL_TICK_MS   || 15000);
const TMP_DIR     = process.env.FL_TMP_DIR          || path.join(process.cwd(), 'fl', 'tmp');
const PY_BIN      = process.env.FL_PYTHON           || 'python';
const TRAIN_PY    = process.env.FL_TRAIN_SCRIPT     || path.join(process.cwd(), 'src', 'fl', 'train_and_diff.py');
const MODEL_ARCH  = process.env.FL_MODEL_ARCH       || 'tv_effnet_b3';
const SD_KEYS_HASH= process.env.FL_SD_KEYS_HASH     || 'v1';

fs.mkdirSync(TMP_DIR, { recursive: true });

function runPython(bin, script, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, [script, ...args], { stdio: 'inherit' });
    p.on('exit', code => code === 0 ? resolve() : reject(new Error(`python exit ${code}`)));
  });
}

/**
 * Train + post delta immediately for a given hospitalId
 * (no MIN_BATCH requirement; used by /fl/train-now)
 */
export async function trainNowForHospital(hospitalId) {
  if (!hospitalId) throw new Error('hospitalId required');

  const queued = await TrainSample.find({ hospitalId, status: 'queued' }).sort({ createdAt: 1 });
  if (queued.length === 0) return { skipped: true, reason: 'no_samples', hospitalId };

  const meta = await getCurrentModelMeta();
  const gPath = path.join(TMP_DIR, `${hospitalId}__global.pth`);
  await downloadCurrentModel(meta.url, gPath);

  const files = queued.map(s => s.path);
  const labels = queued.map(s => s.classLabel);
  const deltaPath = path.join(TMP_DIR, `${hospitalId}__delta.pt`);

//   await runPython(PY_BIN, TRAIN_PY, [
//     '--global', gPath,
//     '--images', ...files,
//     '--labels', ...labels,
//     '--out', deltaPath,
//     '--kind', 'hospital',
//     '--arch', MODEL_ARCH
//   ]);

  await runPython(PY_BIN, TRAIN_PY, [
    '--global', gPath,
    '--images', ...files,
   '--labels', ...labels,
   '--out', deltaPath,
   '--kind', 'hospital'
  ]);

  await postDelta({
    clientId: hospitalId,
    kind: 'hospital',
    numExamples: files.length,
    modelArch: MODEL_ARCH,
    sdKeysHash: SD_KEYS_HASH,
    filePath: deltaPath
  });

  await TrainSample.updateMany(
    { _id: { $in: queued.map(s => s._id) } },
    { $set: { status: 'used' } }
  );

  return { ok: true, hospitalId, used: queued.length, posted: true };
}

/**
 * Scheduled training pass with MIN_BATCH threshold—used by the worker loop
 */
async function trainForHospital(hospitalId) {
  const queued = await TrainSample.find({ hospitalId, status: 'queued' })
    .sort({ createdAt: 1 })
    .limit(MIN_BATCH);

  if (queued.length < MIN_BATCH) {
    return { skipped: true, hospitalId, reason: 'not_enough_samples', queued: queued.length };
  }

  const meta = await getCurrentModelMeta();
  const gPath = path.join(TMP_DIR, `${hospitalId}__global.pth`);
  await downloadCurrentModel(meta.url, gPath);

  const files = queued.map(s => s.path);
  const labels = queued.map(s => s.classLabel);
  const deltaPath = path.join(TMP_DIR, `${hospitalId}__delta.pt`);

  await runPython(PY_BIN, TRAIN_PY, [
    '--global', gPath,
    '--images', ...files,
    '--labels', ...labels,
    '--out', deltaPath,
    '--kind', 'hospital',
    '--arch', MODEL_ARCH
  ]);

  await postDelta({
    clientId: hospitalId,
    kind: 'hospital',
    numExamples: files.length,
    modelArch: MODEL_ARCH,
    sdKeysHash: SD_KEYS_HASH,
    filePath: deltaPath
  });

  await TrainSample.updateMany(
    { _id: { $in: queued.map(s => s._id) } },
    { $set: { status: 'used' } }
  );

  return { ok: true, hospitalId, used: queued.length, posted: true };
}

export async function workerTick() {
  // group by hospital that has queued samples
  const groups = await TrainSample.aggregate([
    { $match: { status: 'queued' } },
    { $group: { _id: '$hospitalId', cnt: { $sum: 1 } } }
  ]);

  const results = [];
  for (const g of groups) {
    const hospitalId = g._id;
    if (!hospitalId) continue;
    try {
      const out = await trainForHospital(hospitalId);
      results.push(out);
    } catch (e) {
      results.push({ ok: false, hospitalId, error: e.message });
    }
  }
  return results;
}

export function startWorkerLoop() {
  setInterval(() => { workerTick().catch(()=>{}) }, TICK_MS);
  console.log(`[FL] worker loop started @ ${TICK_MS} ms`);
}
