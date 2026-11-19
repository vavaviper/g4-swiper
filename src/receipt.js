const footer = /^(?:(?:sub\s*)?total|balance|amount due|cash|change|credit|debit|visa|mastercard|payment|tender|eftpos)\b/i;
const nonItem = /^(?:tax|hst|gst|pst|savings?|discount|special|loyalty|coupon|deposit|bag fee|rounding|refund|rewards?|date|time|cashier|register|transaction|receipt|thank you|item count|card|auth|approved)\b/i;
const categories = {
  Produce: /\b(?:apple|berry|berries|strawberries|banana|zucchini|potato(?:es)?|tomato(?:es)?|onion|spinach|carrot|broccoli|grape|lettuce|pepper|sprout|peas?|avocado|lemon|lime|cucumber|orange|mango|kiwi|celery|mushroom|cabbage|cauliflower|artichoke|squash|pineapple|pomegranate)s?\b/i,
  Dairy: /\b(?:milk|cheese|yogurt|yoghurt|butter|cream|kefir|eggs?)\b/i,
  'Meat & seafood': /\b(?:chicken|beef|pork|salmon|shrimp|tuna|steak|turkey|fish|bacon)\b/i,
};

export function categoryFor(name) {
  return Object.keys(categories).find(category => categories[category].test(name)) || 'Other';
}

export function dateIn(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

// Days from entry for editable fridge reminders when a printed date is unavailable.
// Match specific foods before broad terms, so chicken soup is treated as prepared food.
const expiryDefaults = [
  [1, /\b(?:ground|raw) (?:beef|pork|turkey|chicken|meat)\b|\b(?:salmon|tuna|shrimp|fish|seafood|raw sausage)s?\b/i],
  [2, /\b(?:leftovers?|pizza|pasta|soup|stew|rice|burrito|burger|cheeseburger|carbonara|hot pot|pot pie|meat ?loaf|guacamole|rotisserie|cooked (?:meat|chicken|turkey|beef|pork))s?\b/i],
  [2, /\b(?:chicken|turkey|poultry)\b/i],
  [3, /\b(?:strawberries|strawberry|blueberries|raspberries|blackberries|berries|spinach|mushroom|lettuce|banana|avocado|steak|beef|pork)s?\b/i],
  [4, /\b(?:broccoli|cauliflower|zucchini|cucumber|grape|tomato(?:es)?|pepper|peach(?:es)?|mango(?:es)?|deli meat)s?\b/i],
  [5, /\b(?:milk|cream|cottage cheese|kefir|bread|bagel)s?\b/i],
  [7, /\b(?:yogurt|yoghurt|cheese|cream cheese|apple|orange|carrot|celery|cabbage|potato(?:es)?|onion|lemon|lime)s?\b/i],
  [21, /\beggs?\b/i],
];

export function suggestedExpiry(name) {
  if (/\b(?:frozen|ice cream|shelf[- ]stable)\b/i.test(name)) return '';
  const rule = expiryDefaults.find(([, pattern]) => pattern.test(name));
  return rule ? dateIn(rule[0]) : '';
}

export function food(name, expiry = '', shared = false) {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2),
    name, expiry, shared, category: categoryFor(name),
  };
}

const receiptNames = {
  STRWBRS: 'Strawberries', STRWBRY: 'Strawberries', STRWBR: 'Strawberries',
  ZUCCH: 'Zucchini', BRSLS: 'Brussels sprouts', 'BNNA CVNDSH': 'Cavendish bananas',
  'ORG BNNA': 'Organic bananas', 'GRP TOM': 'Grape tomatoes', 'WHL MLK': 'Whole milk',
};

const expiryMarker = /\b(?:expiry(?: date)?|exp(?:ires)?|use[ -]by|best[ -]before|best[ -]by)\b[.: ]*/i;
const months = 'jan feb mar apr may jun jul aug sep oct nov dec'.split(' ');

function printedExpiry(text) {
  const tail = text.split(expiryMarker)[1]?.trim();
  if (!tail) return '';
  let year, month, day;
  const iso = tail.match(/^(20\d{2})[-/. ](\d{1,2})[-/. ](\d{1,2})\b/);
  const monthFirst = tail.match(/^([A-Za-z]{3,9})[ -]+(\d{1,2})[, -]+(20\d{2})\b/);
  const dayFirst = tail.match(/^(\d{1,2})[ -]+([A-Za-z]{3,9})[, -]+(20\d{2})\b/);
  const numeric = tail.match(/^(\d{1,2})[/.](\d{1,2})[/.](20\d{2})\b/);
  if (iso) [, year, month, day] = iso;
  else if (monthFirst) [, month, day, year] = monthFirst;
  else if (dayFirst) [, day, month, year] = dayFirst;
  else if (numeric && Math.max(Number(numeric[1]), Number(numeric[2])) > 12) {
    [, month, day, year] = numeric;
    if (Number(month) > 12) [day, month] = [month, day];
  } else return '';
  if (/^[a-z]/i.test(month)) month = months.indexOf(month.slice(0, 3).toLowerCase()) + 1;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.getUTCMonth() + 1 !== Number(month) || date.getUTCDate() !== Number(day)) return '';
  return date.toISOString().slice(0, 10);
}

function readableName(name) {
  return name === name.toUpperCase() ? name.toLowerCase().replace(/\b[a-z]/g, char => char.toUpperCase()) : name;
}

export function parseReceipt(text, lowConfidence = new Set()) {
  const items = [];
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim();
    if (footer.test(line)) {
      if (items.length) break;
      continue;
    }
    if (nonItem.test(line) || /(?:\/\s*(?:kg|lb)|\b(?:kg|lb)\s+(?:net|@))/i.test(line)) continue;
    const pricedLine = line.match(/^(.+?)\s+\$?\s*\d{1,5}[.,]\d{2}\s*[A-Z*]{0,3}$/i);
    if (!pricedLine) continue;
    const trailingQuantity = pricedLine[1].match(/\s+(\d{1,3})\s*[@×]\s*\$?\s*\d+[.,]\d{2}\s*$/);
    const prefix = pricedLine[1].replace(/^\d{4,}\s+/, '');
    const leadingQuantity = prefix.match(/^(\d{1,3})\s*[x×]\s*(?=[a-z])/i);
    const followingQuantity = lines[index + 1]?.match(/^\s*(\d{1,3})\s*[@x×]\s*\$?\s*\d+[.,]\d{2}/i);
    const quantity = Number(leadingQuantity?.[1] ?? trailingQuantity?.[1] ?? followingQuantity?.[1]) || 1;
    const description = prefix.slice(leadingQuantity?.[0].length ?? 0).replace(trailingQuantity?.[0] ?? /$^/, '').replace(/[*|]+/g, '').trim();
    const expiry = printedExpiry(description) || printedExpiry(lines[index + 1]?.trim().match(expiryMarker)?.index === 0 ? lines.slice(index + 1, index + 3).join(' ') : '');
    const name = description.split(expiryMarker)[0].trim();
    if (nonItem.test(name) || /^(?:@|\$|\d+[.,]\d|\d+\s*[@x×])/i.test(name)) continue;
    if (!/[a-z?]/i.test(name)) continue;
    const suggestion = receiptNames[name.toUpperCase()];
    const unreadable = !suggestion && (lowConfidence.has(line) || /[?]{2,}|�/.test(name) || !/[a-z]{2}/i.test(name));
    const itemName = unreadable ? '' : suggestion || readableName(name);
    const reminder = expiry ? '' : suggestedExpiry(itemName);
    items.push({
      ...food(itemName, expiry || reminder),
      ...(reminder && { expirySource: 'suggested' }),
      quantity,
      ...((suggestion || unreadable) && { receiptName: name, needsConfirmation: true, unreadable }),
    });
  }
  return items;
}

export async function prepareImage(file, maxDimension, quality) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const normalized = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    return normalized ?? file;
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function recognizeText(image, { onProgress = () => {}, rotateAuto = true, timeout = 30000, blocks = false } = {}) {
  const { createWorker } = await import('tesseract.js');
  const assets = new URL(`${import.meta.env.BASE_URL}ocr/`, window.location.href);
  const worker = await createWorker('eng', 1, {
    workerPath: new URL('worker.min.js', assets).href,
    corePath: new URL('tesseract-core-lstm.wasm.js', assets).href,
    langPath: assets.href,
    errorHandler: () => {},
    logger: ({ status, progress }) => {
      if (status === 'recognizing text') onProgress(Math.round(progress * 100));
    },
  });
  let deadline;
  try {
    const timedOut = new Promise((_, reject) => {
      deadline = setTimeout(() => reject(new Error('Text recognition timed out')), timeout);
    });
    const { data } = await Promise.race([worker.recognize(image, { rotateAuto }, { blocks }), timedOut]);
    return data;
  } finally {
    clearTimeout(deadline);
    await worker.terminate();
  }
}

export async function readReceipt(file, onProgress) {
  const { text, blocks } = await recognizeText(await prepareImage(file, 2800, 0.94), { onProgress, blocks: true });
  const lowConfidence = new Set();
  for (const block of blocks ?? []) {
    for (const paragraph of block.paragraphs) {
      for (const line of paragraph.lines) {
        const nameWords = line.words.filter(word => /[a-z]/i.test(word.text));
        if (nameWords.length && nameWords.every(word => word.confidence < 50)) {
          lowConfidence.add(line.text.trim());
        }
      }
    }
  }
  return parseReceipt(text, lowConfidence);
}

export async function readFoodLabel(file) {
  const { text } = await recognizeText(await prepareImage(file, 1700, 0.9), { rotateAuto: false, timeout: 8000 });
  const label = text.split(/\r?\n/).slice(0, 6).map(line => line.trim()).find(line =>
    /^[a-z][a-z &'’-]{2,39}$/i.test(line) && !nonItem.test(line) &&
    !expiryMarker.test(line) && !/\b(?:ingredients|contains|flavou?r|recipe|allergens?)\b/i.test(line) &&
    categoryFor(line) !== 'Other');
  const quantity = Number(text.match(/\b(\d{1,3})\s*(?:-\s*)?(?:pack|count|ct)\b/i)?.[1]) || 1;
  return { name: label ? readableName(label) : '', expiry: printedExpiry(text), quantity };
}
