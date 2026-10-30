import { isValidReminder } from './reminders.js';
export const dateKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const uid = () => globalThis.crypto.randomUUID?.() || '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c => (Number(c) ^ (globalThis.crypto.getRandomValues(new Uint8Array(1))[0] & 15) >> (Number(c) / 4)).toString(16));
export const money = n => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
export function cycleFor(anchor, startDay, offset = 0) {
  const d = new Date(`${anchor}T12:00:00`);
  const boundary = (year, month) => new Date(year, month, Math.min(startDay, new Date(year, month+1, 0).getDate()), 12);
  let month = d.getMonth();
  if (d < boundary(d.getFullYear(), month)) month--;
  const start = boundary(d.getFullYear(), month + offset);
  const next = boundary(d.getFullYear(), month + offset + 1);
  const end = new Date(next); end.setDate(end.getDate()-1);
  return { start: dateKey(start), end: dateKey(end) };
}
export function freshData() {
  return { version: 1, settings: { startDay: 1, displayName: '' }, tags: [{id:'personal',name:'Cá nhân'},{id:'family',name:'Gia đình'},{id:'work',name:'Công việc'}], categories: [
    {id:'food',name:'Ăn uống',type:'expense',color:'#f1a65a',icon:'Utensils'},
    {id:'shopping',name:'Mua sắm',type:'expense',color:'#a897cf',icon:'ShoppingBag'},
    {id:'transport',name:'Di chuyển',type:'expense',color:'#82b5ce',icon:'Car'},
    {id:'home',name:'Nhà cửa',type:'expense',color:'#d58b8b',icon:'House'},
    {id:'debt',name:'Trả nợ',type:'expense',color:'#9aa7ba',icon:'Wallet'},
    {id:'other',name:'Chi khác',type:'expense',color:'#a5ba83',icon:'Shapes'},
    {id:'salary',name:'Lương',type:'income',color:'#5aab8c',icon:'BriefcaseBusiness'},
    {id:'repayment',name:'Thu nợ',type:'income',color:'#79a9bb',icon:'Wallet'},
    {id:'extra',name:'Thu khác',type:'income',color:'#bda26c',icon:'CircleDollarSign'}
  ], transactions: [], quickTemplates: [], reminders: [] };
}
export function validateData(raw) {
  const fail = () => { throw new Error('Dữ liệu không đúng định dạng sổ thu chi phiên bản 1.'); };
  if (!raw || raw.version !== 1 || !Number.isInteger(raw.settings?.startDay) || raw.settings.startDay < 1 || raw.settings.startDay > 31) fail();
  if (raw.settings.displayName !== undefined && (typeof raw.settings.displayName !== 'string' || raw.settings.displayName.length > 80)) fail();
  if (!['categories','tags','transactions'].every(k => Array.isArray(raw[k]))) fail();
  const quickTemplates = raw.quickTemplates === undefined ? [] : raw.quickTemplates;
  if (!Array.isArray(quickTemplates)) fail();
  const reminders = raw.reminders === undefined ? [] : raw.reminders;
  if (!Array.isArray(reminders) || reminders.some(item=>!isValidReminder(item)) || new Set(reminders.map(item=>item.id)).size!==reminders.length) fail();
  const text = (v,max=80) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
  for (const key of ['categories','tags','transactions']) {
    if (new Set(raw[key].map(x=>x?.id)).size !== raw[key].length || raw[key].some(x=>!text(x?.id,100))) fail();
  }
  if (new Set(quickTemplates.map(t=>t?.id)).size !== quickTemplates.length || quickTemplates.some(t=>!text(t?.id,100))) fail();
  if(raw.tags.some(t=>!text(t.name))) fail();
  if(raw.categories.some(c=>!text(c.name)||!['expense','income'].includes(c.type)||!/^#[0-9a-f]{6}$/i.test(c.color)||!text(c.icon))) fail();
  const validFields = t => Number.isSafeInteger(t.amount)&&t.amount>0&&['expense','income'].includes(t.type)&&typeof t.note==='string'&&t.note.length<=500&&raw.categories.some(c=>c.id===t.categoryId&&c.type===t.type)&&Array.isArray(t.tagIds)&&new Set(t.tagIds).size===t.tagIds.length&&t.tagIds.every(id=>raw.tags.some(tag=>tag.id===id));
  if(raw.transactions.some(t=> !validFields(t)||!/^\d{4}-\d{2}-\d{2}$/.test(t.date)||Number.isNaN(Date.parse(t.date+'T12:00:00'))||dateKey(new Date(t.date+'T12:00:00'))!==t.date)) fail();
  if(quickTemplates.some(t=>!text(t.name)||!validFields(t))) fail();
  const valid = structuredClone(raw);
  valid.settings.displayName = (raw.settings.displayName ?? '').trim();
  valid.quickTemplates = quickTemplates.map(t=>({...structuredClone(t),name:t.name.trim()}));
  valid.reminders = reminders.map(item=>({...structuredClone(item),title:item.title.trim(),completedOccurrence:item.completedOccurrence??null}));
  return valid;
}
const transactionFields = source => ({ type:source.type, amount:source.amount, note:source.note, categoryId:source.categoryId, tagIds:[...source.tagIds] });
export function transactionDraft(source, date = dateKey()) {
  return { id:uid(), date, ...transactionFields(source) };
}
export function quickTemplateDraft(source, name) {
  return { id:uid(), name, ...transactionFields(source) };
}
export function totals(rows) { const income = rows.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0); const expense = rows.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0); return {income,expense,balance:income-expense}; }
