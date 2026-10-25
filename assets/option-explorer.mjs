import {priceCall} from './option-math.mjs';

const byId = id => document.getElementById(id);
const model = JSON.parse(byId('option-data').textContent);
const form = byId('option-controls');
const volatility = byId('option-volatility');
const months = byId('option-months');
const steps = byId('option-steps');
const number = new Intl.NumberFormat('en-GB', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const percent = value => `${(value * 100).toFixed(2)}%`;
const duration = value => `${value} ${value === 1 ? 'month' : 'months'}`;
let announcementTimer;

function update(announce = true) {
  try {
    const sigma = volatility.valueAsNumber * model.volatility;
    const horizon = months.valueAsNumber;
    const count = Number(steps.value);
    const result = priceCall({...model, volatility: sigma, years: horizon / 12, steps: count});
    const original = volatility.valueAsNumber === 1 && horizon === model.months && count === model.steps;
    byId('option-error').hidden = true;
    volatility.setAttribute('aria-valuetext', `${percent(sigma)} annual volatility`);
    months.setAttribute('aria-valuetext', duration(horizon));
    byId('option-volatility-value').textContent = percent(sigma);
    byId('option-months-value').textContent = duration(horizon);
    byId('option-price').textContent = byId('option-mobile-price').textContent = number.format(result.price);
    byId('option-scenario').textContent = original ? 'Original one-step inputs' : 'Your call scenario';
    const change = result.price - model.base.price;
    byId('option-difference').textContent = original ? 'Reproduces the report’s 281.85 headline.'
      : `${change >= 0 ? '+' : '−'}${number.format(Math.abs(change))} points versus the original one-step case.`;
    byId('option-probability').textContent = percent(result.probability);
    byId('option-factors').textContent = `${result.up.toFixed(5)} / ${result.down.toFixed(5)}`;
    for (const tree of document.querySelectorAll('[data-option-tree]')) {
      tree.hidden = Number(tree.dataset.optionTree) !== count;
      if (tree.hidden) continue;
      for (const level of result.nodes) {
        for (const node of level) {
          const key = `${node.step}-${node.upMoves}`;
          const svg = tree.querySelector(`g[data-node="${key}"]`);
          svg.querySelector('.ap-tree-spot').textContent = `S ${number.format(node.underlying)}`;
          svg.querySelector('.ap-tree-call').textContent = `C ${number.format(node.value)}`;
          const row = tree.querySelector(`tr[data-node="${key}"]`);
          row.querySelector('.ap-node-time').textContent = horizon * node.step / count;
          row.querySelector('.ap-node-spot').textContent = number.format(node.underlying);
          row.querySelector('.ap-node-call').textContent = number.format(node.value);
        }
      }
      for (const label of tree.querySelectorAll('[data-time-step]')) {
        const time = horizon * Number(label.dataset.timeStep) / count;
        label.textContent = time === 0 ? 'Today' : duration(time);
      }
      tree.querySelector('svg desc').textContent = `${count}-step tree with ${percent(sigma)} annual volatility and ${duration(horizon)} to expiry. Call value ${number.format(result.price)} index points. S is the index level and C is the call value. All node values are in the table below.`;
    }
    if (announce) {
      clearTimeout(announcementTimer);
      announcementTimer = setTimeout(() => {
        byId('option-announcement').textContent = `${percent(sigma)} annual volatility, ${duration(horizon)}, ${count}-step tree. Call value ${number.format(result.price)} index points.`;
      }, 200);
    }
    return true;
  } catch {
    byId('option-error').textContent = 'This scenario could not be calculated. The last valid result remains visible; reset to the report inputs to continue.';
    byId('option-error').hidden = false;
    return false;
  }
}

form.addEventListener('input', () => update());
form.addEventListener('submit', event => event.preventDefault());
form.addEventListener('reset', event => {
  event.preventDefault();
  volatility.value = '1';
  months.value = String(model.months);
  steps.value = String(model.steps);
  update();
});
if (update(false)) {
  byId('option-explorer').classList.add('ap-explorer-ready');
  form.hidden = false;
  byId('option-fallback').hidden = true;
}
