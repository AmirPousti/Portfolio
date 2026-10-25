// Basic consent: do not contact Google until the visitor explicitly opts in.
const measurementId = 'G-XTHCQS1GN0';
const preferenceKey = 'ap-google-analytics-consent-v1';
const preferenceLifetime = 180 * 24 * 60 * 60 * 1000;
const hostname = window.location.hostname;
// Preview deployments and local tests must not inflate the public site's reports.
const production = hostname === 'amirpousti.com' || hostname === 'www.amirpousti.com';
const panel = document.getElementById('analytics-consent');
const settings = document.getElementById('analytics-settings');
const status = document.getElementById('analytics-status');
const allow = document.getElementById('analytics-allow');
const decline = document.getElementById('analytics-decline');
const denied = {analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'};
let started = false;
let returnFocus = null;

function readChoice() {
  try {
    const preference = JSON.parse(window.localStorage.getItem(preferenceKey));
    const age = Date.now() - preference?.savedAt;
    if (preference?.version === 1 && Number.isFinite(age) && age >= 0 && age < preferenceLifetime
        && ['granted', 'denied'].includes(preference.choice)) return preference.choice;
  } catch { /* Storage can be unavailable or contain an old, invalid value. */ }
  return null;
}

function clearCookies() {
  // Only the two cookies owned by this GA4 installation; leave other site data alone.
  const names = ['_ga', `_ga_${measurementId.slice(2)}`];
  const domains = ['', `; Domain=${hostname}`, '; Domain=amirpousti.com'];
  for (const name of names) {
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; Path=/${domain}; SameSite=Lax`;
    }
  }
}

function applyChoice(choice) {
  const enabled = choice === 'granted' && production;
  window[`ga-disable-${measurementId}`] = !enabled;
  if (!enabled) {
    if (started) window.gtag('consent', 'update', denied);
    clearCookies();
    return;
  }
  if (started) {
    window.gtag('consent', 'update', {...denied, analytics_storage: 'granted'});
    return;
  }
  started = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', denied);
  window.gtag('consent', 'update', {...denied, analytics_storage: 'granted'});
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_domain: hostname,
    cookie_path: '/',
    cookie_expires: preferenceLifetime / 1000,
  });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);
}

function saveChoice(choice) {
  try {
    window.localStorage.setItem(preferenceKey, JSON.stringify({version: 1, choice, savedAt: Date.now()}));
  } catch { /* Honour the choice for this page even when it cannot be saved. */ }
  applyChoice(choice);
  closePanel();
  status.textContent = choice === 'granted' ? 'Optional cookies accepted.' : 'Optional cookies declined.';
}

function openPanel() {
  if (panel.open) return;
  returnFocus = document.activeElement;
  panel.hidden = false;
  panel.show();
}

function closePanel() {
  const hadFocus = panel.contains(document.activeElement);
  panel.close();
  panel.hidden = true;
  if (hadFocus) {
    const target = returnFocus && returnFocus !== document.body ? returnFocus : document.getElementById('main');
    target.focus({preventScroll: true});
  }
  returnFocus = null;
}

allow.addEventListener('click', () => saveChoice('granted'));
decline.addEventListener('click', () => saveChoice('denied'));
settings.addEventListener('click', openPanel);
// Escape dismisses the dialog without granting consent or altering a saved choice.
panel.addEventListener('cancel', event => {
  event.preventDefault();
  closePanel();
});
// Non-modal dialogs do not receive the browser's modal Escape dismissal.
panel.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    event.preventDefault();
    closePanel();
  }
});

// A withdrawal in another tab also disables any already-open portfolio pages.
window.addEventListener('storage', event => {
  if (event.key !== preferenceKey && event.key !== null) return;
  const choice = readChoice();
  applyChoice(choice);
  if (choice !== null) closePanel();
  else if (!document.body.classList.contains('page-privacy')) openPanel();
});

const choice = readChoice();
applyChoice(choice);
settings.hidden = false;
// The privacy policy must remain readable before the visitor makes a choice.
if (choice === null && !document.body.classList.contains('page-privacy')) openPanel();
