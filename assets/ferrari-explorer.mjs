import {calculateDCF} from './explorer-math.mjs';

const byId = id => document.getElementById(id);
const model = JSON.parse(byId('ferrari-data').textContent);
const form = byId('dcf-controls');
const waccControl = byId('dcf-wacc');
const growthControl = byId('dcf-growth');
const rate = value => `${(value * 100).toFixed(2)}%`;
const money = value => new Intl.NumberFormat('en-GB', {style: 'currency', currency: 'EUR'}).format(value);
const billions = value => `€${(value / 1e6).toFixed(2)}bn`;
let announcementTimer;

function update(announce = true) {
  const wi = waccControl.valueAsNumber;
  const gi = growthControl.valueAsNumber;
  const wacc = model.waccRates[wi];
  const growth = model.growthRates[gi];
  try {
    const result = calculateDCF(model, wacc, growth);
    byId('dcf-error').hidden = true;
    waccControl.setAttribute('aria-valuetext', rate(wacc));
    growthControl.setAttribute('aria-valuetext', rate(growth));
    byId('dcf-wacc-value').textContent = rate(wacc);
    byId('dcf-growth-value').textContent = rate(growth);
    byId('dcf-price').textContent = money(result.price);
    byId('dcf-mobile-price').textContent = money(result.price);
    const gap = (result.price / model.referencePrice - 1) * 100;
    byId('dcf-gap').textContent = `${gap >= 0 ? '+' : '−'}${Math.abs(gap).toFixed(2)}% versus the ${money(model.referencePrice)} reference price`;
    byId('dcf-scenario').textContent = wi === 3 && gi === 3 ? 'Original DCF assumptions' : 'Your DCF scenario';
    byId('dcf-forecast-pv').textContent = billions(result.cashFlowPV);
    byId('dcf-terminal-pv').textContent = billions(result.terminalPV);
    byId('dcf-terminal-share').textContent = `${(result.terminalShare * 100).toFixed(1)}%`;
    byId('dcf-forecast-bar').style.width = `${(1 - result.terminalShare) * 100}%`;
    document.querySelector('[data-scenario][data-selected]')?.removeAttribute('data-selected');
    document.querySelector(`[data-scenario="${wi}-${gi}"]`).dataset.selected = 'true';
    if (announce) {
      clearTimeout(announcementTimer);
      announcementTimer = setTimeout(() => {
        byId('dcf-announcement').textContent = `WACC ${rate(wacc)}, terminal growth ${rate(growth)}. DCF value ${money(result.price)} per share. ${Math.abs(gap).toFixed(2)}% ${gap >= 0 ? 'above' : 'below'} the dated reference price.`;
      }, 200);
    }
    return true;
  } catch {
    byId('dcf-error').textContent = 'This scenario could not be calculated. Reset to the original model to continue; the last valid result is still shown.';
    byId('dcf-error').hidden = false;
    return false;
  }
}

form.addEventListener('input', () => update());
form.addEventListener('submit', event => event.preventDefault());
form.addEventListener('reset', event => {
  event.preventDefault();
  waccControl.value = growthControl.value = '3';
  update();
});
if (update(false)) {
  byId('ferrari-explorer').classList.add('ap-explorer-ready');
  form.hidden = false;
  byId('dcf-fallback').hidden = true;
}
