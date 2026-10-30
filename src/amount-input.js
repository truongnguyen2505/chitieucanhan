const digitsOnly = value => String(value ?? '').replace(/\D/g, '');
const normalizeDigits = digits => digits.replace(/^0+(?=\d)/, '');

export function formatAmountInput(value) {
  return normalizeDigits(digitsOnly(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function amountInputState(value, selectionStart, previousValue, inputType = '') {
  const text = String(value ?? '');
  let digits = digitsOnly(text);
  let digitsBefore = digitsOnly(text.slice(0, selectionStart ?? text.length)).length;
  const backward = inputType === 'deleteContentBackward';

  // Deleting a separator also removes the adjacent digit in that direction.
  if ((backward || inputType === 'deleteContentForward') &&
      digits === normalizeDigits(digitsOnly(previousValue)) &&
      text.length < formatAmountInput(previousValue).length) {
    const removed = backward ? digitsBefore - 1 : digitsBefore;
    if (removed >= 0 && removed < digits.length) {
      digits = digits.slice(0, removed) + digits.slice(removed + 1);
      if (backward) digitsBefore--;
    }
  }

  const normalized = normalizeDigits(digits);
  const offset = Math.max(0, Math.min(normalized.length, digitsBefore - (digits.length - normalized.length)));
  const formatted = formatAmountInput(normalized);
  let caret = 0, seen = 0;
  while (caret < formatted.length && seen < offset) {
    if (formatted[caret] !== '.') seen++;
    caret++;
  }
  return { digits: normalized, formatted, caret };
}

const amountDigits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const amountUnits = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

function readAmountGroup(value, full) {
  const hundreds = Math.floor(value / 100);
  const tens = Math.floor(value / 10) % 10;
  const ones = value % 10;
  const words = [];
  if (hundreds || full) words.push(amountDigits[hundreds], 'trăm');
  if (tens > 1) words.push(amountDigits[tens], 'mươi');
  else if (tens === 1) words.push('mười');
  else if (ones && (hundreds || full)) words.push('lẻ');
  if (ones) {
    words.push(ones === 1 && tens > 1 ? 'mốt' :
      ones === 4 && tens > 1 ? 'tư' :
      ones === 5 && tens > 0 ? 'lăm' : amountDigits[ones]);
  }
  return words.join(' ');
}

export function amountToWords(value) {
  const source = String(value ?? '').trim();
  if (!/^\d+$/.test(source)) return '';
  let amount = Number(source);
  if (!Number.isSafeInteger(amount) || amount < 0) return '';
  if (amount === 0) return 'Không đồng';

  const groups = [];
  while (amount > 0) {
    groups.push(amount % 1000);
    amount = Math.floor(amount / 1000);
  }
  const words = [];
  for (let index = groups.length - 1; index >= 0; index--) {
    if (!groups[index]) continue;
    words.push(readAmountGroup(groups[index], words.length > 0));
    if (amountUnits[index]) words.push(amountUnits[index]);
  }
  const text = words.join(' ') + ' đồng';
  return text.charAt(0).toUpperCase() + text.slice(1);
}
