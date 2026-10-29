import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.js';

test('mount redirects to a trailing slash and preserves the query',async()=>{
 const response=await worker.fetch(new Request('https://truongparker.io.vn/chitieucanhan?test=1'),{});
 assert.equal(response.status,308);
 assert.equal(response.headers.get('Location'),'https://truongparker.io.vn/chitieucanhan/?test=1');
});
test('mount serves the index and assets with the prefix removed',async()=>{
 for(const [path,expected] of [['/chitieucanhan/','/'],['/chitieucanhan/assets/app.js?v=1','/assets/app.js?v=1']]){
  let received;
  const env={ASSETS:{fetch:async request=>{received=request;return new Response('asset');}}};
  const response=await worker.fetch(new Request(`https://truongparker.io.vn${path}`,{method:'HEAD'}),env);
  assert.equal(await response.text(),'asset');
  assert.equal(received.url,`https://truongparker.io.vn${expected}`);
  assert.equal(received.method,'HEAD');
 }
});
test('root site and similar prefixes are outside this worker',async()=>{
 for(const path of ['/','/assets/main.js','/chitieucanhan-other','/chitieucanhan2/']){
  const response=await worker.fetch(new Request(`https://truongparker.io.vn${path}`),{});
  assert.equal(response.status,404);
 }
});
