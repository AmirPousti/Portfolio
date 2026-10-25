// A short, silent film controlled by ordinary page scrolling. Native playback
// remains the fallback until metadata is available, or when motion is reduced.
const section = document.getElementById('upright-film');
const stage = section?.querySelector('.ap-upright-film-stage');
const video = document.getElementById('upright-video');
const controls = document.getElementById('upright-video-controls');
const toggle = document.getElementById('upright-scroll-mode');
const hint = document.getElementById('upright-video-hint');
const progressBar = document.getElementById('upright-video-progress');
const filmTitle = document.getElementById('upright-film-title');
const filmCopy = document.getElementById('upright-film-copy');
const header = document.querySelector('.ap-header');

if (section && stage && video && controls && toggle && hint) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const manualHint = hint.textContent;
  const shortViewportHint = 'Use the video controls in this window size.';
  let ready = false;
  let automatic = false;
  // Viewport fit can temporarily suspend the requested mode. It must not be
  // mistaken for the visitor deliberately choosing the playback controls.
  let scrollRequested = !reducedMotion.matches;
  let viewportSuspended = false;
  let visible = false;
  let frame = 0;
  let needsMeasure = true;
  let start = 0;
  let end = 1;
  let targetTime = 0;
  let desiredTime = 0;
  let easedTime = 0;
  let easing = null;
  let currentChapter = -1;
  const catchUpDuration = 110;
  const chapters = [
    ['The whole system.', 'Start with the chassis. Every connection has a role.'],
    ['Closer to the connection.', 'The wheel, hub and suspension come into view.'],
    ['The upright, revealed.', 'The component linking the wheel hub to the suspension.'],
  ];

  function updateStory() {
    if (!ready || video.seeking) return;
    const lastFrame = Math.max(0, video.duration - 1 / 30);
    const progress = lastFrame > 0 ? Math.min(1, Math.max(0, video.currentTime / lastFrame)) : 0;
    if (progressBar) progressBar.value = progress;
    section.style.setProperty('--ap-film-progress', progress.toFixed(4));
    const chapter = progress < .29 ? 0 : progress < .62 ? 1 : 2;
    if (chapter !== currentChapter) {
      if (filmTitle) filmTitle.textContent = chapters[chapter][0];
      if (filmCopy) filmCopy.textContent = chapters[chapter][1];
      currentChapter = chapter;
    }
    if (automatic) hint.textContent = progress >= .95 ? 'Keep scrolling to compare' : 'Scroll to explore';
  }

  function measure() {
    const headerHeight = header?.getBoundingClientRect().height || 0;
    // The shared UI module owns the header offset. Measuring this film must
    // never feed its result back into the header's own CSS min-height: doing
    // that makes resize ordering change both the header and the sticky track.
    const bounds = section.getBoundingClientRect();
    start = window.scrollY + bounds.top - headerHeight;
    const stageHeight = stage.getBoundingClientRect().height;
    end = start + Math.max(1, bounds.height - stageHeight);
    needsMeasure = false;
    return stageHeight <= window.innerHeight - headerHeight + 1;
  }

  function seek() {
    // Let the decoder finish its pending seek, then take the latest requested
    // position. A fast wheel gesture never builds a queue of obsolete frames.
    if (!automatic || !ready || video.seeking) return;
    if (Math.abs(video.currentTime - targetTime) < 1 / 60) return;
    try {
      video.currentTime = targetTime;
    } catch {
      // Some mobile decoders need loadeddata before they can seek. That event
      // retries the current position; there is no permanent animation loop.
    }
  }

  function update(timestamp) {
    frame = 0;
    if (needsMeasure) {
      const fits = measure();
      if (automatic && !fits) {
        setMode(false, {preservePosition: visible, viewportFallback: true});
        return;
      }
      if (ready && !automatic && viewportSuspended && scrollRequested) {
        // CSS has applied the new viewport/header size before this frame.
        // Try the sticky geometry again, retaining the decoded frame if shown.
        setMode(true, {preservePosition: visible});
        return;
      }
    }
    if (!automatic || !ready) return;
    const progress = Math.min(1, Math.max(0, (window.scrollY - start) / (end - start)));
    // Stay inside the final decoded frame instead of seeking beyond the film.
    const nextTime = progress * Math.max(0, video.duration - 1 / 30);
    if (easing) {
      const elapsed = Math.min(1, (timestamp - easing.started) / catchUpDuration);
      easedTime = easing.from + (desiredTime - easing.from) * (1 - (1 - elapsed) ** 3);
      if (elapsed === 1) easing = null;
    }
    if (Math.abs(nextTime - desiredTime) > .0001) {
      desiredTime = nextTime;
      easing = {from: easedTime, started: timestamp};
    }
    if (!visible || Math.abs(easedTime - desiredTime) < 1 / 120) {
      easedTime = desiredTime;
      easing = null;
    }
    targetTime = easedTime;
    seek();
    // Only the short catch-up runs between scroll events. Once settled, there
    // is no animation loop or decoder work until another input arrives.
    if (easing) schedule();
  }

  function schedule(remeasure = false) {
    needsMeasure ||= remeasure;
    if (!frame) frame = window.requestAnimationFrame(update);
  }

  function setMode(enabled, {preservePosition = false, viewportFallback = false} = {}) {
    const previousTop = preservePosition ? stage.getBoundingClientRect().top : 0;
    const previousTime = video.currentTime;
    easing = null;
    easedTime = desiredTime = targetTime = previousTime;
    automatic = Boolean(enabled && ready);
    section.classList.toggle('is-scroll-video', automatic);
    const tooShort = automatic && !measure();
    if (tooShort) {
      automatic = false;
      section.classList.remove('is-scroll-video');
    }
    viewportSuspended = tooShort || viewportFallback;
    toggle.textContent = automatic ? 'Use video controls' : 'Explore with scroll';
    video.controls = !automatic;
    if (automatic) {
      video.pause();
      video.preload = 'auto';
    }
    hint.textContent = automatic
      ? 'Scroll to explore'
      : viewportSuspended ? shortViewportHint : manualHint;
    updateStory();

    if (preservePosition) {
      // Removing the sticky track must not strand the visitor below the film.
      // Re-entering it maps the existing frame to its equivalent scroll point.
      // Explicit toggles and a visible film falling back to manual mode keep
      // that context. Initial loading and offscreen fallbacks never scroll.
      if (automatic) {
        measure();
        const lastFrame = Math.max(0, video.duration - 1 / 30);
        const progress = lastFrame > 0 ? Math.min(1, Math.max(0, previousTime / lastFrame)) : 0;
        window.scrollTo({top: start + progress * (end - start), behavior: 'instant'});
      } else {
        // A resize can shorten the track before this callback runs, leaving
        // the previously sticky stage clipped above the viewport. Anchor that
        // fallback below the header instead of preserving a negative offset.
        const visibleTop = Math.max(previousTop, header?.getBoundingClientRect().height || 0);
        const shift = stage.getBoundingClientRect().top - visibleTop;
        if (Math.abs(shift) > 1) window.scrollBy({top: shift, behavior: 'instant'});
      }
    }
    // measure() already read the enhanced geometry. Do not request another
    // measurement here: a failed fit would otherwise retry itself endlessly.
    schedule();
  }

  function initialise() {
    if (ready || !Number.isFinite(video.duration) || video.duration <= 0) return;
    ready = true;
    controls.hidden = false;
    setMode(scrollRequested);
  }

  function fallback() {
    const preservePosition = automatic && visible;
    ready = false;
    setMode(false, {preservePosition});
    controls.hidden = true;
  }

  toggle.addEventListener('click', () => {
    scrollRequested = !automatic;
    setMode(scrollRequested, {preservePosition: true});
  });
  video.addEventListener('loadedmetadata', initialise);
  video.addEventListener('durationchange', initialise);
  video.addEventListener('loadeddata', () => {
    initialise();
    updateStory();
    schedule();
  });
  video.addEventListener('play', () => {
    if (!automatic) {
      scrollRequested = false;
      viewportSuspended = false;
    }
  });
  video.addEventListener('seeked', () => {
    updateStory();
    seek();
  });
  video.addEventListener('timeupdate', updateStory);
  video.addEventListener('error', fallback);
  // Changing the OS preference stops scroll motion immediately. Changing it
  // back does not override a visitor's choice to use the playback controls.
  reducedMotion.addEventListener('change', event => {
    if (event.matches) {
      scrollRequested = false;
      setMode(false, {preservePosition: automatic && visible});
    }
  });
  window.addEventListener('scroll', () => {
    if (automatic && visible) schedule();
  }, {passive: true});
  window.addEventListener('resize', () => schedule(true), {passive: true});
  window.addEventListener('pageshow', () => schedule(true));
  window.addEventListener('load', () => schedule(true), {once: true});

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      // Also clamp to the first/last frame when a large scroll leaves the film.
      schedule(true);
    });
    observer.observe(section);
  } else {
    visible = true;
  }
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(() => schedule(true));
    observer.observe(stage);
    if (header) observer.observe(header);
  }
  document.fonts?.ready.then(() => schedule(true));
  if (video.readyState >= 1) initialise();
}
