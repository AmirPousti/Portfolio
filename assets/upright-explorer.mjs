import {difference} from './explorer-math.mjs';

const model = JSON.parse(document.getElementById('upright-data').textContent);
const form = document.getElementById('upright-controls');
const referenceControl = document.getElementById('upright-reference');
const signed = (value, digits) => `${value < 0 ? '−' : '+'}${Math.abs(value).toFixed(digits)}`;

function update(announce = true) {
  const reference = model.designs.find(design => design.id === referenceControl.value);
  if (!reference) return;
  for (const cell of document.querySelectorAll('[data-delta]')) {
    const [id, key] = cell.dataset.delta.split(':');
    const design = model.designs.find(item => item.id === id);
    const delta = difference(design[key], reference[key]);
    let change;
    if (key === 'mass') change = `${signed(delta.absolute * 1000, 2)} g`;
    else if (key === 'deformation') change = `${signed(delta.absolute, 5)} mm`;
    else if (key === 'cost') change = `${delta.absolute < 0 ? '−' : '+'}£${Math.abs(delta.absolute).toFixed(2)}`;
    else change = signed(delta.absolute, 2);
    cell.textContent = id === reference.id ? 'Reference' : `${change} (${signed(delta.percent, 1)}%)`;
    cell.hidden = false;
  }
  if (announce) document.getElementById('upright-announcement').textContent = `All changes now compare with ${reference.name}. Absolute results and the Iteration 5 recommendation are unchanged.`;
}

form.addEventListener('change', () => update());
form.addEventListener('submit', event => event.preventDefault());
form.addEventListener('reset', event => {
  event.preventDefault();
  referenceControl.value = 'baseline';
  update();
});
update(false);
form.hidden = false;
