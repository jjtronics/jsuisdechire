const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const coreSource = fs.readFileSync('static/js/core.js', 'utf8');
const sequence = ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 't10', 't11'];

function runGuard(currentTestId){
  const storage = new Map([['jsd:nick', 'Testeur']]);
  const currentIndex = sequence.indexOf(currentTestId);
  for (const id of sequence.slice(0, currentIndex)) {
    storage.set(`jsd:done:${id}`, '1');
  }

  let intervalCallback;
  let redirectedTo;
  const context = {
    URLSearchParams,
    localStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, String(value)),
    },
    location: {
      pathname: `/${currentTestId}`,
      replace: (route) => { redirectedTo = route; },
    },
    setTimeout: (callback) => callback(),
    setInterval: (callback) => { intervalCallback = callback; return 1; },
  };
  context.window = context;
  context.jsdFlow = {
    ensureSequence: () => sequence,
    routeFor: (id) => `/${id}`,
  };

  vm.runInNewContext(coreSource, context, { filename: 'core.js' });
  storage.set(`jsd:done:${currentTestId}`, '1');
  intervalCallback();
  return redirectedTo;
}

for (const [index, id] of sequence.entries()) {
  test(`${id} advances immediately after its completion marker is written`, () => {
    assert.equal(runGuard(id), index === sequence.length - 1 ? '/results' : `/${sequence[index + 1]}`);
  });
}
