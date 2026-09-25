function initProductImageLenses() {
  document.querySelectorAll('.product-substep-images figure img').forEach(image => {
    const figure = image.closest('figure');
    if (!figure || figure.dataset.lensBound === 'true') return;

    const lens = document.createElement('span');
    lens.className = 'product-image-lens';
    lens.setAttribute('aria-hidden', 'true');
    figure.appendChild(lens);
    figure.dataset.lensBound = 'true';

    const updateLens = event => {
      const rect = image.getBoundingClientRect();
      if (!rect.width || !rect.height || !image.naturalWidth || !image.naturalHeight) return;

      const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
      const sourceX = x * image.naturalWidth / rect.width;
      const sourceY = y * image.naturalHeight / rect.height;
      const lensSize = lens.offsetWidth;
      const left = Math.max(0, Math.min(rect.width - lensSize, x - lensSize / 2));
      const top = Math.max(0, Math.min(rect.height - lensSize, y - lensSize / 2));

      lens.style.left = left + 'px';
      lens.style.top = top + 'px';
      lens.style.backgroundImage = 'url("' + (image.currentSrc || image.src) + '")';
      lens.style.backgroundPosition = (lensSize / 2 - sourceX) + 'px ' + (lensSize / 2 - sourceY) + 'px';
    };

    image.addEventListener('mouseenter', event => {
      figure.classList.add('rts-lens-active');
      updateLens(event);
    });
    image.addEventListener('mousemove', updateLens);
    image.addEventListener('mouseleave', () => figure.classList.remove('rts-lens-active'));
  });
}

document.addEventListener('DOMContentLoaded', initProductImageLenses);
