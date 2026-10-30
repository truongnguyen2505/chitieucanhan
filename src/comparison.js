import { cycleFor, dateKey, totals } from './domain.js';

const DAY = 86400000;
const timestamp = date => Date.parse(date+'T00:00:00Z');
const dayCount = period => Math.round((timestamp(period.end)-timestamp(period.start))/DAY)+1;
const firstDays = (period, days) => ({start:period.start,end:new Date(timestamp(period.start)+(days-1)*DAY).toISOString().slice(0,10)});

function change(current, previous) {
 const delta=current-previous;
 // A non-positive baseline has no useful percentage for a signed balance.
 return {current,previous,delta,percent:previous>0?delta/previous*100:null};
}

export function comparePeriods(ledger, anchor, offset=0, {mode='full',today=dateKey()}={}) {
 const fullCurrent=cycleFor(anchor,ledger.settings.startDay,offset);
 const fullPrevious=cycleFor(anchor,ledger.settings.startDay,offset-1);
 const canMatch=today>=fullCurrent.start;
 const isCurrent=today>=fullCurrent.start&&today<=fullCurrent.end;
 const effectiveMode=mode==='matched'&&canMatch?'matched':'full';
 let currentPeriod=fullCurrent,previousPeriod=fullPrevious,matchedDays=null;
 if(effectiveMode==='matched'){
  const availableDays=isCurrent?dayCount({start:fullCurrent.start,end:today}):dayCount(fullCurrent);
  matchedDays=Math.min(availableDays,dayCount(fullPrevious));
  currentPeriod=firstDays(fullCurrent,matchedDays);
  previousPeriod=firstDays(fullPrevious,matchedDays);
 }
 const select = period => ledger.transactions.filter(t=>t.date>=period.start&&t.date<=period.end);
 const currentRows=select(currentPeriod),previousRows=select(previousPeriod);
 const summarize = (rows,period) => ({...period,days:dayCount(period),count:rows.length,...totals(rows)});
 const current=summarize(currentRows,currentPeriod),previous=summarize(previousRows,previousPeriod);
 const metrics=Object.fromEntries(['income','expense','balance'].map(key=>[key,change(current[key],previous[key])]));
 const byCategory = rows => {
  const amounts=new Map();
  for(const row of rows)amounts.set(row.categoryId,(amounts.get(row.categoryId)||0)+row.amount);
  return amounts;
 };
 const currentCategories=byCategory(currentRows),previousCategories=byCategory(previousRows);
 const categories=ledger.categories.map(category=>({...category,...change(currentCategories.get(category.id)||0,previousCategories.get(category.id)||0)}))
  .filter(category=>category.current>0||category.previous>0)
  .sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)||b.current-a.current||a.name.localeCompare(b.name,'vi'));
 return {mode:effectiveMode,canMatch,isCurrent,matchedDays,fullCurrent,fullPrevious,current,previous,metrics,categories};
}
