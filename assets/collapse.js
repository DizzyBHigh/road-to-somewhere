function initCollapseToggles() {
  document.querySelectorAll('.collapse-toggle[data-toggle]').forEach(toggle => {
    if (toggle.dataset.collapseBound === 'true') return;
    const target = document.getElementById(toggle.dataset.toggle);
    if (!target) return;
    toggle.dataset.collapseBound = 'true';
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      target.hidden = expanded;
      toggle.textContent = expanded ? 'Expand +' : 'Collapse −';
    });
  });
}

document.addEventListener('DOMContentLoaded', initCollapseToggles);