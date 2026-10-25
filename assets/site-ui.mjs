// Keep anchor and sticky-result offsets aligned with the actual shared header.
const header = document.querySelector('.ap-header');
function measureHeader() {
  if (!header) return;
  // Let the current breakpoint establish its base height before measuring;
  // an inline measurement from a wider viewport must not keep mobile tall.
  document.documentElement.style.removeProperty('--ap-header-h');
  const height = `${Math.ceil(header.getBoundingClientRect().height)}px`;
  if (document.documentElement.style.getPropertyValue('--ap-header-h') !== height) {
    document.documentElement.style.setProperty('--ap-header-h', height);
  }
}
measureHeader();
if (header && 'ResizeObserver' in window) {
  new ResizeObserver(measureHeader).observe(header);
} else {
  window.addEventListener('resize', measureHeader, {passive: true});
}

// Inline chart coordinates scale with the figure; keep their labels at 13 CSS px.
const charts = [...document.querySelectorAll('.ap-inline-chart')]
  .map(node => node.tagName.toLowerCase() === 'svg' ? node : node.querySelector('svg'))
  .filter(Boolean);
function measureChart(svg) {
  const width = svg.getBoundingClientRect().width;
  const viewWidth = svg.viewBox?.baseVal?.width || 600;
  // Narrow phones get slightly smaller labels so the axis values stay inside the frame.
  const target = width < 420 ? 11 : 13;
  if (width > 0) svg.style.setProperty('--ap-chart-label-size', `${target * viewWidth / width}px`);
}
for (const svg of charts) measureChart(svg);
if ('ResizeObserver' in window && charts.length) {
  const observer = new ResizeObserver(entries => {
    for (const {target} of entries) measureChart(target);
  });
  for (const svg of charts) observer.observe(svg);
}

// The header rule appears only once the page has moved beneath it.
if (header) {
  const update = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  update();
  window.addEventListener('scroll', update, {passive: true});
}
