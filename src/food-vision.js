import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-cpu';
import { load } from '@tensorflow-models/mobilenet';
import { prepareImage } from './receipt.js';

const foodLabels = new Set([
  'guacamole', 'consomme', 'hot pot', 'trifle', 'ice cream', 'ice lolly', 'French loaf',
  'bagel', 'pretzel', 'cheeseburger', 'hotdog', 'mashed potato', 'head cabbage', 'broccoli',
  'cauliflower', 'zucchini', 'spaghetti squash', 'acorn squash', 'butternut squash',
  'cucumber', 'artichoke', 'bell pepper', 'cardoon', 'mushroom', 'Granny Smith', 'strawberry',
  'orange', 'lemon', 'fig', 'pineapple', 'banana', 'jackfruit', 'custard apple', 'pomegranate',
  'carbonara', 'chocolate sauce', 'dough', 'meat loaf', 'pizza', 'potpie', 'burrito',
  'red wine', 'espresso', 'eggnog',
]);
const names = { 'Granny Smith': 'Granny Smith apple', hotdog: 'Hot dog', potpie: 'Pot pie' };
let classifier;

async function loadClassifier() {
  await tf.setBackend('cpu');
  const modelUrl = new URL(`${import.meta.env.BASE_URL}food-model/model.json`, window.location.href).href;
  return load({ version: 2, alpha: 0.5, inputRange: [0, 1], modelUrl });
}

export async function identifyFood(file) {
  const url = URL.createObjectURL(await prepareImage(file, 480, 0.85));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    classifier ??= loadClassifier().catch(error => {
      classifier = undefined;
      throw error;
    });
    const predictions = await (await classifier).classify(image, 3);
    for (const { className, probability } of predictions) {
      const label = className.split(',')[0];
      if (probability >= 0.18 && foodLabels.has(label)) {
        return names[label] ?? label.charAt(0).toUpperCase() + label.slice(1);
      }
    }
    return '';
  } finally {
    URL.revokeObjectURL(url);
  }
}
