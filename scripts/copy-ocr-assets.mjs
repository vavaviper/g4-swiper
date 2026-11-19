import { copyFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const fromTesseract = createRequire(require.resolve('tesseract.js'));
const destination = new URL('../public/ocr/', import.meta.url);
const assets = [
  [require.resolve('tesseract.js/dist/worker.min.js'), 'worker.min.js'],
  [fromTesseract.resolve('tesseract.js-core/tesseract-core-lstm.wasm.js'), 'tesseract-core-lstm.wasm.js'],
  [require.resolve('@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz'), 'eng.traineddata.gz'],
];

await mkdir(destination, { recursive: true });
await Promise.all(assets.map(([source, name]) => copyFile(source, new URL(name, destination))));
