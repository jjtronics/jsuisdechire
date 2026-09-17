// End-to-end check against tests/browser_training_server.py. Uses real page
// scripts and player input, never writes a game's result or completion marker.
// node tests/training-browser.mjs [http://127.0.0.1:4177] [training|normal|both]
import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';

const base=process.argv[2]||'http://127.0.0.1:4177';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname)) throw Error('Use the isolated local test server.');
const mode=process.argv[3]||'both';
const output=await fs.mkdtemp('/private/tmp/jsd-games-e2e-');
const executable=process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const chrome=spawn(executable,['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+output+'/chrome','about:blank'],{stdio:['ignore','ignore','pipe']});
const keys=['rxn','str','prs','bal','mem','rfl','drv','pong','ice','tilt','dino'];
let ws;
const failures=[];
try{
  const endpoint=await new Promise((resolve,reject)=>{
    let out='';chrome.stderr.on('data',b=>{out+=b;const m=out.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m)resolve(m[1]);});chrome.on('error',reject);
  });
  ws=new WebSocket(endpoint);await new Promise(r=>ws.onopen=r);
  let id=0;const pending=new Map(),errors=[],requests=[];
  ws.onmessage=e=>{
    const m=JSON.parse(e.data);
    if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);
    if(m.method==='Network.requestWillBeSent')requests.push(m.params.request);
    if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}
  };
  const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{
    pending.set(++id,{resolve,reject});ws.send(JSON.stringify({id,method,params,sessionId}));
  });
  const {targetId}=await send('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
  const call=(method,params)=>send(method,params,sessionId);
  await call('Runtime.enable');await call('Page.enable');await call('Network.enable');
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  const evaluate=async expression=>{
    const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;
  };
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const until=async(expression,timeout=18000)=>{
    const end=Date.now()+timeout;
    while(Date.now()<end){try{if(await evaluate(expression))return;}catch(e){}await wait(100);}
    throw Error('Timed out: '+expression);
  };
  const navigate=async path=>{
    await call('Page.navigate',{url:base+path});
    await until(`document.readyState==='complete' && location.pathname===${JSON.stringify(path.split('?')[0])}`);
  };
  const point=async selector=>evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing ${selector}');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  const mouse=async(type,p)=>call('Input.dispatchMouseEvent',{type,...p,button:type==='mouseMoved'?'none':'left',buttons:type==='mousePressed'?1:0,clickCount:1});
  const click=async selector=>{const p=await point(selector);await mouse('mousePressed',p);await mouse('mouseReleased',p);};
  const motion=()=>evaluate(`window.testMotion=setInterval(()=>{const e=new Event('devicemotion');const x=Math.sin(performance.now()/100)*.25;Object.defineProperties(e,{acceleration:{value:{x,y:0,z:0}},accelerationIncludingGravity:{value:{x,y:0,z:9.80665}}});window.dispatchEvent(e);},20);`);
  const shot=async name=>{const {data}=await call('Page.captureScreenshot',{format:'png'});await fs.writeFile(output+'/'+name+'.png',Buffer.from(data,'base64'));};

  async function play(n,variant){
    switch(n){
      case 1:
        await click('.t1-reaction-area');await until(`document.querySelector('.t1-reaction-area').classList.contains('bg-green-500')`);
        await click('.t1-reaction-area');break;
      case 2:
        await click('#t2-start-button');await wait(80);await click('.t2-color-grid button');break;
      case 3:
        await click('.t3-start');break; // Finish by the actual timer.
      case 4:
        await click('.t4-start');
        if(variant==='touch'){
          await until(`!document.querySelector('.t4-fallback').classList.contains('hidden')`);
          const p=await point('.t4-fallback > div');
          await mouse('mousePressed',p);
          // Holding perfectly still must count as a valid stability attempt.
          await wait(3400);await mouse('mouseReleased',p);
        }else await motion();
        break;
      case 5:
        await click('.t5-start');await until(`document.querySelector('.t5-card') && !document.querySelector('.t5-card').classList.contains('is-revealed')`);
        await wait(500);
        const pairs=await evaluate(`(()=>{const groups={};[...document.querySelectorAll('.t5-card')].forEach((e,i)=>{const key=e.querySelector('.t5-brand-label').textContent;(groups[key]||=[]).push(i+1);});return Object.values(groups);})()`);
        for(const pair of pairs){for(const i of pair)await click('.t5-card:nth-child('+i+')');await wait(100);}
        break;
      case 6:
        await click('.t6-start');await until(`!!document.querySelector('.t6-cup:not(:disabled)')`);await click('.t6-cup:not(:disabled)');break;
      case 7:await click('.t7-start');break;
      case 8:{
        const p=await point('.t8-ball');await mouse('mousePressed',p);
        await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:p.x-110,y:p.y-115,button:'left',buttons:1});
        await mouse('mouseReleased',{x:p.x-110,y:p.y-115});break;
      }
      case 9:await click('#t9 [data-start]');break;
      case 10:await click('#t10 [data-start]');break;
      case 11:await click('#t11 [data-touch]');break;
    }
  }
  const modes=mode==='both'?['training','normal']:[mode];
  for(const runMode of modes){
    const cases=[...Array.from({length:11},(_,i)=>({n:i+1,variant:'default'})),{n:4,variant:'touch'}];
    for(const {n,variant} of cases){
      const label=`${runMode}-t${n}-${variant}`;
      try{
        await navigate('/training');
        // Seed only earlier games for the normal sequence guard, never the
        // game under test. Training uses the real in-page storage isolation.
        await evaluate(`localStorage.clear();localStorage.setItem('jsd:nick','Browser test');localStorage.setItem('jsd:cookie-consent','declined');${runMode==='normal'?Array.from({length:n-1},(_,i)=>`localStorage.setItem('jsd:done:t${i+1}','1');`).join(''):''}`);
        errors.length=0;requests.length=0;
        await navigate('/t'+n+(runMode==='training'?'?training=1':''));
        await play(n,variant);
        if(runMode==='training'){
          await until(`!!document.querySelector('dialog.training-result[open]')`,18000);
          const result=await evaluate(`({score:JSON.parse(localStorage.getItem('jsd:${keys[n-1]}')).score,display:document.querySelector('[data-training-score]').textContent,href:document.querySelector('.training-result-return').getAttribute('href')})`);
          assert.equal(result.display,String(Math.round(result.score)));assert.equal(result.href,'/training');
          await wait(1200);assert.equal(await evaluate('location.pathname'),'/t'+n);
          await shot(label);
          const previousOrigin=await evaluate('performance.timeOrigin');
          await click('.training-result-replay');
          await until(`performance.timeOrigin!==${previousOrigin} && document.readyState==='complete'`);
          assert.equal(await evaluate('location.pathname'),'/t'+n);
          assert.equal(await evaluate(`new URLSearchParams(location.search).get('training')`),'1');
          assert.equal(await evaluate(`localStorage.getItem('jsd:${keys[n-1]}')`),null,'replay clears the previous practice score');
          assert.equal(await evaluate(`localStorage.getItem('jsd:done:t${n}')`),null,'replay clears completion');
          assert.equal(await evaluate(`!!document.querySelector('dialog.training-result')`),false);
          await play(n,variant);
          await until(`!!document.querySelector('dialog.training-result[open]')`,18000);
          assert.equal(await evaluate(`document.querySelector('[data-training-score]').textContent`),
            String(Math.round(await evaluate(`JSON.parse(localStorage.getItem('jsd:${keys[n-1]}')).score`))));
          await click('.training-result-return');await until(`location.pathname==='/training'`);
          assert.equal(requests.some(r=>r.method==='POST' && new URL(r.url).pathname==='/api/submit'),false);
        }else{
          const next=n===11?'/results':'/t'+(n+1);
          await until(`location.pathname===${JSON.stringify(next)}`,18000);
          assert.equal(await evaluate(`localStorage.getItem('jsd:done:t${n}')`),'1');
          assert.equal(await evaluate(`typeof JSON.parse(localStorage.getItem('jsd:${keys[n-1]}')).score`),'number');
        }
        assert.equal(errors.length,0,JSON.stringify(errors));
        console.log('PASS '+label);
      }catch(error){
        failures.push(label+': '+error.message);console.log('FAIL '+label+': '+error.message);
        await shot('FAIL-'+label).catch(()=>{});
      }
    }
  }
  console.log('Artifacts: '+output);
  if(failures.length)throw Error(failures.join('\n'));
}finally{ws?.close();chrome.kill();}
