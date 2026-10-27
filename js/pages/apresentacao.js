(() => {
  const slides = Array.from(document.querySelectorAll('.slide'));
  const prev = document.getElementById('prevSlide');
  const next = document.getElementById('nextSlide');
  const counter = document.getElementById('slideCounter');
  const progress = document.getElementById('progressBar');
  const dotNav = document.getElementById('dotNav');
  const notesToggle = document.getElementById('notesToggle');
  const fullscreenToggle = document.getElementById('fullscreenToggle');
  let current = 0;

  slides.forEach((slide, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', 'Ir para o slide ' + (index + 1) + ': ' + slide.dataset.title);
    dot.addEventListener('click', () => showSlide(index));
    dotNav.appendChild(dot);
  });

  function showSlide(index) {
    current = Math.max(0, Math.min(slides.length - 1, index));
    slides.forEach((slide, i) => {
      const active = i === current;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', String(!active));
    });
    Array.from(dotNav.children).forEach((dot, i) => {
      if (i === current) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    prev.disabled = current === 0;
    next.textContent = current === slides.length - 1 ? 'Recomeçar ↺' : 'Próximo →';
    counter.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
    progress.style.width = ((current + 1) / slides.length * 100) + '%';
    document.title = slides[current].dataset.title + ' — PedeJá Delivery';
  }
  function goNext() { showSlide(current === slides.length - 1 ? 0 : current + 1); }
  function goPrev() { showSlide(current - 1); }
  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch (_) { /* Fullscreen may be blocked by the browser. */ }
  }
  prev.addEventListener('click', goPrev);
  next.addEventListener('click', goNext);
  document.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', goNext));
  notesToggle.addEventListener('click', () => {
    const enabled = document.body.classList.toggle('show-notes');
    notesToggle.setAttribute('aria-pressed', String(enabled));
    notesToggle.textContent = enabled ? 'Ocultar notas' : 'Notas';
  });
  fullscreenToggle.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', () => {
    fullscreenToggle.textContent = document.fullscreenElement ? '⛶ Sair da tela cheia' : '⛶ Tela cheia';
  });
  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
    if (['ArrowRight', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); goNext(); }
    else if (['ArrowLeft', 'PageUp'].includes(event.key)) { event.preventDefault(); goPrev(); }
    else if (event.key.toLowerCase() === 'f') toggleFullscreen();
    else if (event.key.toLowerCase() === 'n') notesToggle.click();
    else if (event.key === 'Home') showSlide(0);
    else if (event.key === 'End') showSlide(slides.length - 1);
    else if (event.key === 'Escape' && document.fullscreenElement) document.exitFullscreen();
  });
  showSlide(0);
})();