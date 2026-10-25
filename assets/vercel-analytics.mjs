// Vercel serves this endpoint after Web Analytics is enabled and redeployed.
// Keep local previews and copies on other hosts out of the visitor statistics.
const hostname = window.location.hostname;
const hostedOnVercel = hostname === 'amirpousti.com'
  || hostname === 'www.amirpousti.com'
  || hostname.endsWith('.vercel.app');

if (hostedOnVercel) {
  window.va = window.va || function () {
    (window.vaq = window.vaq || []).push(arguments);
  };
  const source = '/_vercel/insights/script.js';
  if (!document.head.querySelector(`script[src="${source}"]`)) {
    const script = document.createElement('script');
    script.src = source;
    script.defer = true;
    document.head.appendChild(script);
  }
}
