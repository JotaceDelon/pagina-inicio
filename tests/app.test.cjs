const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const {webcrypto} = require('node:crypto');
function app(options = {}) {
  const nodes = new Map();
  function node() { return {children:[],value:'',hidden:false,dataset:{},classList:{toggle(){}},append(...items){this.children.push(...items)},replaceChildren(...items){this.children=items},setAttribute(){},addEventListener(){},focus(){},showModal(){},close(){},reset(){}}; }
  const context = vm.createContext({crypto:webcrypto, URL, console, AbortSignal,TextEncoder,TextDecoder,Uint8Array,btoa,atob,confirm:()=>true, setInterval(){},window:{addEventListener(){}},fetch:options.fetch || (async()=>({ok:true,json:async()=>JSON.parse(data)})),document:{documentElement:{dataset:{}},querySelectorAll:()=>[],getElementById(id){if(!nodes.has(id)) nodes.set(id,node());return nodes.get(id)},createElement:node,addEventListener(){}},localStorage:{getItem:key=>options.storage?.[key] || null,setItem:(key,value)=>{if(options.storage) options.storage[key]=value;}},matchMedia:()=>({matches:false,addEventListener(){}})});
  vm.runInContext(fs.readFileSync('js/app.js','utf8'),context);
  return {run:code=>vm.runInContext(code,context),nodes};
}
const data = fs.readFileSync('data/links.json','utf8');
test('JSON links and preferences survive validation',()=>{
 const a=app(); a.run(`state=validate(${data})`);
 const total=JSON.parse(data).categorias.reduce((n,c)=>n+c.enlaces.length,0);
 assert.equal(a.run('allLinks().length'),total);
 a.run('state.preferences.theme="auto";state=validate(JSON.parse(JSON.stringify(state)))');
 assert.equal(a.run('state.preferences.theme'),'auto');
});
test('Unsafe protocols and malformed input are rejected',()=>{
 const a=app();
 for(const url of ['javascript:alert(1)','data:text/html,test','file:///tmp/example']) assert.throws(()=>a.run(`validate({categorias:[{nombre:'Prueba',enlaces:[{nombre:'Enlace',url:${JSON.stringify(url)}}]}]})`));
 assert.throws(()=>a.run('validate({categorias:[{}]})'));
});
test('Category searches ignore accents and show the whole matching category',()=>{
 const a=app();a.run(`state=validate(${data})`);
 a.nodes.set('search',{value:'comunicacion'});a.run('render()');
 assert.equal(a.nodes.get('categories').children.length,1);
 assert.equal(a.nodes.get('categories').children[0].children[1].children.length,4);
 assert.equal(a.nodes.get('empty').hidden,true);
});
test('No results message appears and clearing search restores all categories',()=>{
 const a=app();a.run(`state=validate(${data})`);a.nodes.set('search',{value:'zzzz-no-results'});a.run('render()');
 assert.equal(a.nodes.get('empty').hidden,false);
 a.nodes.get('search').value='';a.run('render()');
 assert.equal(a.nodes.get('categories').children.length,JSON.parse(data).categorias.length);
});
test('Icon picker selects, remembers and cycles engines with arrow keys',()=>{
 const a=app();a.run(`state=validate(${data});initEnginePicker();updateEnginePicker()`);
 a.nodes.get('engine-google').onclick();
 assert.equal(a.run('state.preferences.engine'),'google');
 assert.equal(a.nodes.get('engine-google').tabIndex,0);
 assert.match(a.nodes.get('web-search').placeholder,/Google/);
 a.nodes.get('engine-google').onkeydown({key:'ArrowRight',preventDefault(){}});
 assert.equal(a.run('state.preferences.engine'),'duckduckgo');
 a.nodes.get('engine-duckduckgo').onkeydown({key:'ArrowRight',preventDefault(){}});
 assert.equal(a.run('state.preferences.engine'),'brave');
});
test('Storage failures produce an actionable message',()=>{
 const a=app();a.run(`state=validate(${data});localStorage.setItem=()=>{throw new Error('quota')}`);
 assert.equal(a.run('save()'),false);
 assert.match(a.nodes.get('status').textContent,/preferencias/);
});

test('Published JSON wins over old browser links; preferences migrate',async()=>{
 const legacy={categorias:[{nombre:'Solo local',enlaces:[{nombre:'Local',url:'https://example.com'}]}],preferences:{theme:'light',engine:'google'}};
 const a=app({storage:{'mi-espacio-v1':JSON.stringify(legacy)}});
 await a.run('init()');
 assert.equal(a.run('allLinks().some(l=>l.nombre==="Local")'),false);
 assert.equal(a.run('allLinks().length'),JSON.parse(data).categorias.flatMap(c=>c.enlaces).length);
 assert.equal(a.run('state.preferences.theme'),'light');
 assert.equal(a.nodes.has('add-link'),false);
 assert.equal(a.nodes.has('github-open'),false);
});
test('Saving preferences never persists links or credentials',()=>{
 const storage={};const a=app({storage});a.run(`state=validate(${data});save()`);
 const saved=JSON.parse(storage['mi-espacio-preferences-v2']);
 assert.equal(saved.categorias,undefined); assert.equal(saved.theme,'dark');
});

test('Notes persist separately across reloads, preserve multiline text and can be emptied',async()=>{
 const storage={};const a=app({storage});await a.run('init()');
 a.nodes.get('quick-notes').value='Una idea\nOtra idea 🎨';a.nodes.get('quick-notes').oninput();
 const b=app({storage});await b.run('init()');
 assert.equal(b.nodes.get('quick-notes').value,'Una idea\nOtra idea 🎨');
 b.nodes.get('theme').value='light';b.nodes.get('theme').onchange();
 assert.equal(b.nodes.get('quick-notes').value,'Una idea\nOtra idea 🎨');
 b.nodes.get('quick-notes').value='';b.nodes.get('quick-notes').oninput();
 const c=app({storage});await c.run('init()');assert.equal(c.nodes.get('quick-notes').value,'');
});
