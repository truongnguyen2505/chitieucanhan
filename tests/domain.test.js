import test from 'node:test';
import assert from 'node:assert/strict';
import { cycleFor, freshData, validateData, totals } from '../src/domain.js';
test('payday cycle crosses months and years',()=>{
 assert.deepEqual(cycleFor('2026-10-24',25),{start:'2026-09-25',end:'2026-10-24'});
 assert.deepEqual(cycleFor('2026-10-25',25),{start:'2026-10-25',end:'2026-11-24'});
 assert.deepEqual(cycleFor('2026-01-02',25),{start:'2025-12-25',end:'2026-01-24'});
 assert.deepEqual(cycleFor('2026-10-24',25,1),{start:'2026-10-25',end:'2026-11-24'});
});
test('month end boundaries clamp with no gaps in leap years',()=>{
 assert.deepEqual(cycleFor('2028-02-29',31),{start:'2028-02-29',end:'2028-03-30'});
 assert.deepEqual(cycleFor('2026-02-27',31),{start:'2026-01-31',end:'2026-02-27'});
 assert.deepEqual(cycleFor('2026-02-28',31),{start:'2026-02-28',end:'2026-03-30'});
 for(let day=1;day<=31;day++)for(let month=1;month<=12;month++){
 const anchor=`2028-${String(month).padStart(2,'0')}-15`;
 const current=cycleFor(anchor,day),next=cycleFor(anchor,day,1);
 assert.equal(Date.parse(next.start)-Date.parse(current.end),86400000);
 }
});
test('import validates complete relations, amounts, dates and duplicate ids',()=>{
 const data=freshData();assert.deepEqual(validateData(data),data);
 const entry={id:'t',type:'expense',amount:100,date:'2026-10-29',categoryId:'food',tagIds:['personal'],note:''};
 data.transactions.push(entry);assert.doesNotThrow(()=>validateData(data));
 for(const change of [{amount:-1},{amount:1.5},{date:'2026-02-30'},{categoryId:'salary'},{tagIds:['missing']},{tagIds:['personal','personal']}]){
 const copy=structuredClone(data);Object.assign(copy.transactions[0],change);assert.throws(()=>validateData(copy));
 }
 data.transactions.push(entry);assert.throws(()=>validateData(data));
});
test('totals distinguish income, expense and balance',()=>{
 assert.deepEqual(totals([{type:'income',amount:1000},{type:'expense',amount:300},{type:'expense',amount:200}]),{income:1000,expense:500,balance:500});
 assert.deepEqual(totals([]),{income:0,expense:0,balance:0});
});
