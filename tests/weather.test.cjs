const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const fixture = { current:{temperature_2m:23.2,apparent_temperature:22.1,weather_code:0,is_day:1,time:'2026-10-24T17:45'},daily:{temperature_2m_max:[24.1],temperature_2m_min:[12.3],precipitation_probability_max:[30]} };
function app(fetcher) {
 const nodes=new Map(), storage=new Map();let requests=0;
 const ctx=vm.createContext({console,Date,AbortSignal,document:{addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,{setAttribute(){}});return nodes.get(id)}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},fetch:async(...args)=>{requests++;return fetcher(...args)}});
 vm.runInContext(fs.readFileSync('js/weather.js','utf8'),ctx);
 return {run:c=>vm.runInContext(c,ctx),nodes,storage,requests:()=>requests};
}
test('Weather maps daytime, nighttime and WMO conditions',()=>{
 const a=app();
 assert.equal(a.run('weatherDescription(0,true)[0]'),'☀️');
 assert.equal(a.run('weatherDescription(0,false)[0]'),'🌙');
 assert.equal(a.run('weatherDescription(63,true)[1]'),'Lluvia');
 assert.equal(a.run('weatherDescription(999,true)[1]'),'Condiciones no disponibles');
 assert.throws(()=>a.run('parseWeather({current:{temperature_2m:null}})'));
});
test('Real response fields render and fresh cache prevents repeated requests',async()=>{
 const a=app(async()=>({ok:true,json:async()=>fixture}));
 await a.run('loadWeather()');
 assert.equal(a.nodes.get('weather-temp').textContent,'23 °C');
 assert.match(a.nodes.get('weather-details').textContent,/Mín 12° · Máx 24° · Lluvia 30 %/);
 assert.equal(a.nodes.get('weather-refresh').disabled,false);
 await a.run('loadWeather()');assert.equal(a.requests(),1);
 await a.run('loadWeather(true)');assert.equal(a.requests(),2);
});
test('Unavailable API offers retry without inventing a temperature',async()=>{
 const a=app(async()=>{throw new Error('offline')});
 await a.run('loadWeather()');
 assert.equal(a.nodes.get('weather-temp').textContent,'—');
 assert.match(a.nodes.get('weather-summary').textContent,/No se pudo cargar/);
 assert.equal(a.nodes.get('weather-refresh').disabled,false);
});
test('Stale cache is labeled when refresh fails, expired cache is discarded',async()=>{
 const a=app(async()=>{throw new Error('offline')});
 const w=a.run(`parseWeather(${JSON.stringify(fixture)})`);
 a.storage.set('mi-espacio-weather-jaen-v1',JSON.stringify({savedAt:Date.now()-60*60*1000,weather:w}));
 await a.run('loadWeather()');
 assert.equal(a.nodes.get('weather-temp').textContent,'23 °C');
 assert.match(a.nodes.get('weather-updated').textContent,/Sin actualizar/);
 a.storage.set('mi-espacio-weather-jaen-v1',JSON.stringify({savedAt:Date.now()-4*60*60*1000,weather:w}));
 await a.run('loadWeather()');
 assert.equal(a.nodes.get('weather-temp').textContent,'—');
});
