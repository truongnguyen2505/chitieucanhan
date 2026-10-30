import test from 'node:test';
import assert from 'node:assert/strict';
import { formatAmountInput, amountInputState, amountToWords } from '../src/amount-input.js';
import { freshData, transactionDraft, quickTemplateDraft, validateData } from '../src/domain.js';

test('amounts are grouped as digits are typed and when existing entries are opened', () => {
  for (const [value, expected] of [
    ['', ''], ['1', '1'], ['10', '10'], ['100', '100'], ['1000', '1.000'],
    ['10000', '10.000'], ['100000', '100.000'], ['1000000', '1.000.000'],
    [25000, '25.000'], [0, '0'], [null, ''], [undefined, '']
  ]) assert.equal(formatAmountInput(value), expected);
});

test('pasted grouping, spaces and leading zeroes produce a plain numeric model', () => {
  for (const value of ['1.234.567', '1 234 567', '0001234567']) {
    assert.deepEqual(amountInputState(value, value.length, '', 'insertFromPaste'), {
      digits: '1234567', formatted: '1.234.567', caret: 9
    });
  }
  assert.deepEqual(amountInputState('000', 3, '', 'insertFromPaste'), {
    digits: '0', formatted: '0', caret: 1
  });
});

test('editing in the middle preserves the cursor relative to the digits', () => {
  assert.deepEqual(amountInputState('1.9200', 3, '1200', 'insertText'), {
    digits: '19200', formatted: '19.200', caret: 2
  });
  assert.deepEqual(amountInputState('12.456', 3, '123456', 'deleteContentBackward'), {
    digits: '12456', formatted: '12.456', caret: 2
  });
});

test('Backspace and Delete work across thousands separators', () => {
  assert.deepEqual(amountInputState('1234', 1, '1234', 'deleteContentBackward'), {
    digits: '234', formatted: '234', caret: 0
  });
  assert.deepEqual(amountInputState('1234', 1, '1234', 'deleteContentForward'), {
    digits: '134', formatted: '134', caret: 1
  });
  assert.deepEqual(amountInputState('', 0, '5', 'deleteContentBackward'), {
    digits: '', formatted: '', caret: 0
  });
});

test('formatted amounts save as the same integer in transactions and quick templates', () => {
  const { digits } = amountInputState('1.234.567', 9, '', 'insertFromPaste');
  const source = { type: 'expense', amount: Number(digits), categoryId: 'food', tagIds: [], note: '' };
  const ledger = freshData();
  ledger.transactions.push(transactionDraft(source));
  ledger.quickTemplates.push(quickTemplateDraft(source, 'Regular expense'));
  const valid = validateData(ledger);
  assert.equal(valid.transactions[0].amount, 1234567);
  assert.equal(valid.quickTemplates[0].amount, 1234567);
});

test('large amounts keep their exact digits so the existing safe-integer check still applies', () => {
  assert.equal(formatAmountInput(Number.MAX_SAFE_INTEGER), '9.007.199.254.740.991');
  const { digits } = amountInputState('9.007.199.254.740.992', 21, '', 'insertFromPaste');
  assert.equal(digits, '9007199254740992');
  assert.equal(Number.isSafeInteger(Number(digits)), false);
});

test('amount words use Vietnamese endings for tens and hundreds', () => {
  for (const [amount, words] of [
    [1, 'Một đồng'], [5, 'Năm đồng'], [10, 'Mười đồng'], [11, 'Mười một đồng'],
    [14, 'Mười bốn đồng'], [15, 'Mười lăm đồng'], [21, 'Hai mươi mốt đồng'],
    [24, 'Hai mươi tư đồng'], [25, 'Hai mươi lăm đồng'],
    [100, 'Một trăm đồng'], [101, 'Một trăm lẻ một đồng'],
    [104, 'Một trăm lẻ bốn đồng'], [105, 'Một trăm lẻ năm đồng'],
    [110, 'Một trăm mười đồng'], [115, 'Một trăm mười lăm đồng'],
    [124, 'Một trăm hai mươi tư đồng'], [999, 'Chín trăm chín mươi chín đồng']
  ]) assert.equal(amountToWords(amount), words, String(amount));
});

test('amount words retain the place values of sparse thousands, millions and billions', () => {
  for (const [amount, words] of [
    [1000, 'Một nghìn đồng'],
    [1001, 'Một nghìn không trăm lẻ một đồng'],
    [1010, 'Một nghìn không trăm mười đồng'],
    [1005, 'Một nghìn không trăm lẻ năm đồng'],
    [1100, 'Một nghìn một trăm đồng'],
    [1250000, 'Một triệu hai trăm năm mươi nghìn đồng'],
    [1000001, 'Một triệu không trăm lẻ một đồng'],
    [1001000, 'Một triệu không trăm lẻ một nghìn đồng'],
    [1000000000, 'Một tỷ đồng'],
    [1000000010, 'Một tỷ không trăm mười đồng'],
    [1234567890, 'Một tỷ hai trăm ba mươi tư triệu năm trăm sáu mươi bảy nghìn tám trăm chín mươi đồng'],
    [1000000000000, 'Một nghìn tỷ đồng'],
    [1000000000000000, 'Một triệu tỷ đồng']
  ]) assert.equal(amountToWords(amount), words, String(amount));
});

test('amount words follow the input model and disappear when it is cleared', () => {
  const { digits } = amountInputState('1.250.000', 9, '', 'insertFromPaste');
  assert.equal(amountToWords(digits), 'Một triệu hai trăm năm mươi nghìn đồng');
  assert.equal(amountToWords('00025'), 'Hai mươi lăm đồng');
  assert.equal(amountToWords(0), 'Không đồng');
  for (const value of ['', '  ', null, undefined, -1, 1.5, NaN, Infinity, 'abc', '1e3']) {
    assert.equal(amountToWords(value), '', String(value));
  }
});

test('amount words are exact up to the supported safe-integer limit', () => {
  assert.equal(amountToWords(Number.MAX_SAFE_INTEGER),
    'Chín triệu tỷ không trăm lẻ bảy nghìn tỷ một trăm chín mươi chín tỷ hai trăm năm mươi tư triệu bảy trăm bốn mươi nghìn chín trăm chín mươi mốt đồng');
  assert.equal(amountToWords('9007199254740992'), '');
});
