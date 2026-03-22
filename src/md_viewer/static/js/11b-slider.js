// ---- Image table → slider conversion ----
function convertImageTablesToSliders(container) {
  container.querySelectorAll('table').forEach(table => {
    // Check if first row cells all contain an <img> (and nothing else significant)
    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length < 1 || rows.length > 2) return;

    const imgRow = rows[0];
    const cells = Array.from(imgRow.querySelectorAll('td, th'));
    if (cells.length < 2) return;

    const images = [];
    for (const cell of cells) {
      const img = cell.querySelector('img');
      if (!img) return; // not an image table
      // Cell should contain only the image (allow whitespace text nodes)
      const hasOtherContent = Array.from(cell.childNodes).some(n =>
        n !== img && !(n.nodeType === 3 && !n.textContent.trim())
      );
      if (hasOtherContent) return;
      images.push(img);
    }

    // Get optional captions from second row
    const captions = [];
    if (rows.length === 2) {
      const captionCells = Array.from(rows[1].querySelectorAll('td, th'));
      captionCells.forEach(c => captions.push(c.textContent.trim()));
    }

    // Build slider
    const slider = document.createElement('div');
    slider.className = 'md-slider';

    const track = document.createElement('div');
    track.className = 'md-slider-track';

    images.forEach((img, i) => {
      const slide = document.createElement('div');
      slide.className = 'md-slider-slide' + (i === 0 ? ' active' : '');
      slide.dataset.index = i;

      const clonedImg = img.cloneNode(true);
      clonedImg.className = 'md-slider-img';
      slide.appendChild(clonedImg);

      if (captions[i]) {
        const cap = document.createElement('p');
        cap.className = 'md-slider-caption';
        cap.textContent = captions[i];
        slide.appendChild(cap);
      }

      track.appendChild(slide);
    });

    slider.appendChild(track);

    // Controls
    const controls = document.createElement('div');
    controls.className = 'md-slider-controls';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'md-slider-btn md-slider-prev';
    prevBtn.setAttribute('aria-label', 'Previous slide');
    prevBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';

    const nextBtn = document.createElement('button');
    nextBtn.className = 'md-slider-btn md-slider-next';
    nextBtn.setAttribute('aria-label', 'Next slide');
    nextBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';

    const dots = document.createElement('div');
    dots.className = 'md-slider-dots';
    images.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'md-slider-dot' + (i === 0 ? ' active' : '');
      dot.dataset.index = i;
      dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
      dots.appendChild(dot);
    });

    controls.appendChild(prevBtn);
    controls.appendChild(dots);
    controls.appendChild(nextBtn);
    slider.appendChild(controls);

    // Wire up interactions
    let current = 0;
    const slides = slider.querySelectorAll('.md-slider-slide');
    const allDots = slider.querySelectorAll('.md-slider-dot');

    function goTo(idx) {
      slides[current].classList.remove('active');
      allDots[current].classList.remove('active');
      current = ((idx % slides.length) + slides.length) % slides.length;
      slides[current].classList.add('active');
      allDots[current].classList.add('active');
    }

    prevBtn.addEventListener('click', () => goTo(current - 1));
    nextBtn.addEventListener('click', () => goTo(current + 1));
    allDots.forEach(d => d.addEventListener('click', () => goTo(+d.dataset.index)));

    // Swipe
    let startX = 0;
    slider.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    slider.addEventListener('touchend', e => {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) goTo(current + (diff > 0 ? 1 : -1));
    });

    // Replace table with slider
    table.parentNode.replaceChild(slider, table);
  });
}
