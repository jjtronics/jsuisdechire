const assert=require('node:assert/strict');
const test=require('node:test');
const {Liquid,interior,areaBelow,liquidLevel,initialVolume}=require('../static/js/t4-beer.js');
const advance=(model,seconds,hz=60)=>{for(let i=0;i<seconds*hz;i++)model.step(1/hz);};
const spilled=model=>model.pools.reduce((sum,p)=>sum+p.volume,0);

test('rest and a slight tilt retain all beer and leave the table dry',()=>{
  const m=new Liquid();advance(m,2);m.motion(5,0);advance(m,2);
  assert.equal(m.volume,initialVolume);assert.equal(spilled(m),0);
});
test('tilting preserves liquid area beneath a horizontal surface',()=>{
  for(const angle of [-38,-20,0,20,38]){
    const points=interior(angle),volume=initialVolume*.7;
    assert.ok(Math.abs(areaBelow(points,liquidLevel(points,volume))-volume)<.1);
  }
});
test('overflow falls on the tilted side, grows the pool and never refills the glass',()=>{
  for(const direction of [-1,1]){
    const m=new Liquid();m.motion(direction*25,0);advance(m,2);
    const first=spilled(m);assert.ok(first>0);
    assert.equal(m.pools[direction<0?1:0].volume,0);
    m.motion(direction*38,0);
    let previous=first;
    for(let i=0;i<180;i++){
      m.step(1/60);assert.ok(spilled(m)>=previous);previous=spilled(m);
      const inFlight=m.parcels.reduce((sum,p)=>sum+p.volume,0);
      assert.ok(Math.abs(m.volume+spilled(m)+inFlight-initialVolume)<1e-6);
    }
    assert.ok(spilled(m)>first);
    m.motion(0,0);advance(m,2);
    const volume=m.volume,pool=spilled(m);advance(m,3);
    assert.equal(m.volume,volume);assert.equal(spilled(m),pool);
    m.reset();assert.equal(m.volume,initialVolume);assert.equal(spilled(m),0);assert.equal(m.parcels.length,0);
  }
});
test('vigorous shaking can spill beer even with the phone held flat',()=>{
  const m=new Liquid();m.motion(0,1);advance(m,3);assert.ok(spilled(m)>0);
});
test('amount spilled is consistent across display refresh rates',()=>{
  const amounts=[30,60,120].map(hz=>{
    const m=new Liquid();m.motion(32,.25);advance(m,3,hz);return initialVolume-m.volume;
  });
  assert.ok(Math.max(...amounts)-Math.min(...amounts)<initialVolume*.005);
});
