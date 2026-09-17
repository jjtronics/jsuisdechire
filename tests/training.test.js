const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const source = fs.readFileSync('static/js/training.js', 'utf8');
const scoreKeys = ['rxn','str','prs','bal','mem','rfl','drv','pong','ice','tilt','dino'];

function harness(game, training=true){
  const storage = new Map();
  const dialogs = [];
  let tick, cleared=false, reloads=0;
  const context = {
    jsdConfig:{training}, location:{pathname:`/${game}`,reload:()=>{reloads++;}},
    i18n:key=>key,
    setInterval:callback=>{tick=callback;return 1;},
    clearInterval:()=>{cleared=true;}, addEventListener:()=>{},
    localStorage:{getItem:key=>storage.get(key)||null},
    document:{
      head:{appendChild:()=>{}},body:{appendChild:el=>dialogs.push(el)},
      createElement:tag=>{
        const children = new Map();
        return {
          tag, innerHTML:'', setAttribute:()=>{},addEventListener:()=>{},
          querySelectorAll:()=>[],
          querySelector:selector=>{
            if(!children.has(selector))children.set(selector,{
              textContent:'',listeners:{},focus(){this.focused=true;},
              addEventListener(type,callback){this.listeners[type]=callback;},
              click(){this.listeners.click?.();},
            });
            return children.get(selector);
          },
          showModal(){this.open=true;},
        };
      },
    },
  };
  context.window=context;
  vm.runInNewContext(source,context);
  return {storage,dialogs,tick,get cleared(){return cleared;},get reloads(){return reloads;}};
}

scoreKeys.forEach((key,index)=>{
  test(`training t${index+1}: final score offers replay and return until the player chooses`,()=>{
    const h=harness(`t${index+1}`),score=index===0?0:index===10?100:73;
    h.storage.set(`jsd:${key}`,JSON.stringify({score}));h.tick();
    assert.equal(h.dialogs.length,0,'score alone is not completion');
    h.storage.set(`jsd:done:t${index+1}`,'1');h.tick();
    assert.equal(h.dialogs.length,1);
    const dialog=h.dialogs[0];
    assert.equal(dialog.open,true);
    assert.equal(dialog.querySelector('[data-training-score]').textContent,String(score));
    assert.equal(dialog.querySelector('.training-result-game').textContent,`selection.game.t${index+1}.title`);
    assert.match(dialog.innerHTML,/href="\/training"/);
    assert.match(dialog.innerHTML,/data-i18n="training.replay"/);
    assert.equal(dialog.querySelector('.training-result-replay').focused,true);
    assert.equal(h.reloads,0,'no automatic replay');
    assert.equal(h.cleared,true);
    h.tick();assert.equal(h.dialogs.length,1,'completion is shown only once');
    dialog.querySelector('.training-result-replay').click();
    assert.equal(h.reloads,1,'replay reloads the same training page');
  });
});
test('normal sessions do not get a training result watcher',()=>{
  assert.equal(harness('t1',false).tick,undefined);
});
test('completion waits for a valid score rather than showing a fabricated zero',()=>{
  const h=harness('t4');h.storage.set('jsd:done:t4','1');
  for(const value of ['null','{broken','{}','{"score":null}']){
    h.storage.set('jsd:bal',value);h.tick();assert.equal(h.dialogs.length,0);
  }
  h.storage.set('jsd:bal','{"score":82}');h.tick();assert.equal(h.dialogs.length,1);
});
test('training never submits a score, including for signed-in players and forced submissions',async()=>{
  const context={jsdConfig:{training:true},fetch:()=>assert.fail('training must not send scores')};
  context.window=context;
  vm.runInNewContext(fs.readFileSync('static/js/session.js','utf8'),context);
  assert.equal((await context.jsdSession.submitScore({force:true})).status,'training');
});
