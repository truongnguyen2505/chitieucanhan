import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalRepository } from '../src/repository.js';
import { freshData } from '../src/domain.js';

test('reset removes the ledger key, frees its storage and keeps unrelated keys', async()=>{
 const values=new Map([['another-app','keep']]);
 globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
 const repo=new LocalRepository();
 const ledger=freshData();ledger.settings.startDay=25;ledger.settings.displayName='Minh Anh';
 ledger.tags.push({id:'custom',name:'Tag riêng'});
 ledger.transactions.push({id:'t',date:'2026-10-29',amount:85000,type:'expense',categoryId:'food',tagIds:['custom'],note:'Kiểm tra'});
 await repo.save(ledger);
 assert.ok(repo.raw());
 await repo.reset();
 assert.equal(repo.raw(),null);
 assert.deepEqual([...values.entries()],[['another-app','keep']]);
 assert.deepEqual(await repo.load(),freshData());
 assert.equal(repo.raw(),null,'loading defaults must not recreate the stored ledger');
 await repo.reset(); // resetting an already empty ledger is safe
});

test('reset reports storage errors and leaves existing data untouched',async()=>{
 const existing=JSON.stringify(freshData());
 globalThis.localStorage={getItem:()=>existing,removeItem:()=>{throw new Error('blocked');}};
 const repo=new LocalRepository();
 await assert.rejects(repo.reset(),/Không xóa được dữ liệu/);
 assert.equal(repo.raw(),existing);
});

test('display names persist, can change and load from legacy stored ledgers',async()=>{
 const values=new Map();
 globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
 const repo=new LocalRepository(),ledger=freshData();
 ledger.settings.displayName='  Nguyễn Minh Anh  ';
 await repo.save(ledger);
 assert.equal((await new LocalRepository().load()).settings.displayName,'Nguyễn Minh Anh');
 ledger.settings.displayName='An';
 await repo.save(ledger);
 assert.equal((await repo.load()).settings.displayName,'An');
 delete ledger.settings.displayName;
 const legacy=JSON.stringify(ledger);
 values.set('la.personal-ledger.v1',legacy);
 assert.equal((await repo.load()).settings.displayName,'');
 assert.equal(repo.raw(),legacy,'loading a legacy ledger must not overwrite it');
});
