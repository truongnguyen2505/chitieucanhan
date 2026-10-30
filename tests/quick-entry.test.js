import test from 'node:test';
import assert from 'node:assert/strict';
import { freshData, validateData, transactionDraft, quickTemplateDraft, dateKey, totals } from '../src/domain.js';
import { LocalRepository } from '../src/repository.js';

const entry = () => ({id:'original',date:'2026-09-25',type:'expense',amount:25000,note:'Cà phê',categoryId:'food',tagIds:['personal','work']});
const template = () => quickTemplateDraft(entry(),'Cà phê buổi sáng');

test('old ledgers and backups load with no templates and remain unchanged',()=>{
 const old=freshData();delete old.quickTemplates;old.transactions.push(entry());
 const before=structuredClone(old),loaded=validateData(old);
 assert.deepEqual(loaded,{...before,quickTemplates:[]});
 assert.deepEqual(old,before);
});

test('copying a transaction creates independent drafts dated today and leaves the source intact',()=>{
 const source=entry(),before=structuredClone(source),copy=transactionDraft(source),another=transactionDraft(source);
 assert.equal(copy.date,dateKey());
 assert.notEqual(copy.id,source.id);
 assert.notEqual(another.id,copy.id);
 for(const key of ['type','amount','note','categoryId','tagIds'])assert.deepEqual(copy[key],source[key]);
 copy.tagIds.pop();copy.amount=30000;copy.note='Đổi ghi chú';
 assert.deepEqual(source,before);
 assert.equal(transactionDraft(source,'2026-11-02').date,'2026-11-02');
});

test('templates never carry the source transaction identity or date and do not affect totals',()=>{
 const ledger=freshData(),source=entry(),saved=quickTemplateDraft(source,'Cà phê');
 assert.notEqual(saved.id,source.id);
 assert.equal('date' in saved,false);
 assert.equal(saved.name,'Cà phê');
 ledger.quickTemplates.push(saved);
 assert.deepEqual(totals(ledger.transactions),{income:0,expense:0,balance:0});
 const draft=transactionDraft(saved);
 assert.equal('name' in draft,false);
 assert.notEqual(draft.id,saved.id);
 draft.tagIds.push('family');
 assert.deepEqual(saved.tagIds,['personal','work']);
 assert.deepEqual(source,entry());
 assert.doesNotThrow(()=>validateData(ledger));
});

test('template validation rejects invalid amounts, names, duplicate IDs and stale category/tag references',()=>{
 for(const change of [
  {amount:0},{amount:-1},{amount:1.5},{amount:Number.MAX_SAFE_INTEGER+1},
  {name:''},{name:'   '},{name:'A'.repeat(81)},{name:42},
  {categoryId:'missing'},{categoryId:'salary'},{type:'transfer'},
  {tagIds:['missing']},{tagIds:['personal','personal']},{tagIds:null},
  {note:'A'.repeat(501)},{note:42}
 ]){
  const ledger=freshData();ledger.quickTemplates.push({...template(),...change});
  assert.throws(()=>validateData(ledger),JSON.stringify(change));
 }
 for(const value of [null,{},'bad',[null]]){
  const ledger=freshData();ledger.quickTemplates=value;
  assert.throws(()=>validateData(ledger));
 }
 const duplicate=freshData(),t=template();duplicate.quickTemplates.push(t,{...t});
 assert.throws(()=>validateData(duplicate));
 const income=freshData();income.quickTemplates.push({...template(),type:'income',categoryId:'salary'});
 assert.doesNotThrow(()=>validateData(income));
});

test('templates survive saving, reloading and JSON backup; resetting removes them',async()=>{
 const values=new Map();
 globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
 const repo=new LocalRepository(),ledger=freshData();ledger.quickTemplates.push({...template(),name:'  Cà phê  '});
 await repo.save(ledger);
 const loaded=await new LocalRepository().load();
 assert.equal(loaded.quickTemplates[0].name,'Cà phê');
 assert.equal(loaded.transactions.length,0);
 assert.deepEqual(validateData(JSON.parse(JSON.stringify(loaded))),loaded);
 loaded.quickTemplates[0].amount=30000;await repo.save(loaded);
 assert.equal((await repo.load()).quickTemplates[0].amount,30000);
 await repo.reset();assert.deepEqual((await repo.load()).quickTemplates,[]);
});

test('failed template saves keep the existing stored ledger',async()=>{
 const saved=JSON.stringify(freshData());
 globalThis.localStorage={getItem:()=>saved,setItem:()=>{throw new Error('quota exceeded');}};
 const ledger=freshData();ledger.quickTemplates.push(template());
 await assert.rejects(new LocalRepository().save(ledger),/Không lưu được/);
 assert.equal(new LocalRepository().raw(),saved);
});
