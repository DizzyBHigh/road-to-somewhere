const COLLAPSE_STORAGE_PREFIX = 'rts-collapse:v1:';

function collapseStorageKey(toggle) {
  return `${COLLAPSE_STORAGE_PREFIX}${window.location.pathname}:${toggle.dataset.toggle}`;
}

function setCollapseState(toggle, target, expanded) {
  toggle.setAttribute('aria-expanded', String(expanded));
  target.hidden = !expanded;
  toggle.textContent = expanded ? 'Collapse −' : 'Expand +';
}

function loadCollapseState(toggle) {
  try {
    return localStorage.getItem(collapseStorageKey(toggle)) === 'expanded';
  } catch {
    return false;
  }
}

function saveCollapseState(toggle, expanded) {
  try {
    localStorage.setItem(collapseStorageKey(toggle), expanded ? 'expanded' : 'collapsed');
  } catch {
    // Storage may be unavailable; collapsing still works for this page load.
  }
}

function toggleCollapse(toggle, target) {
  const expanded = toggle.getAttribute('aria-expanded') === 'true';
  setCollapseState(toggle, target, !expanded);
  saveCollapseState(toggle, !expanded);
}

function initCollapseToggles() {
  document.querySelectorAll('.collapse-toggle[data-toggle]').forEach(toggle => {
    if (toggle.dataset.collapseBound === 'true') return;
    const target = document.getElementById(toggle.dataset.toggle);
    if (!target) return;

    toggle.dataset.collapseBound = 'true';
    setCollapseState(toggle, target, loadCollapseState(toggle));

    const bar = toggle.closest('.product-guide-heading, .section-heading-row');
    if (bar) {
      bar.addEventListener('click', event => {
        if (event.target.closest('.collapse-toggle')) return;
        toggleCollapse(toggle, target);
      });
      bar.setAttribute('role', 'button');
      bar.setAttribute('tabindex', '0');
      bar.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        if (event.target.closest('.collapse-toggle')) return;
        event.preventDefault();
        toggleCollapse(toggle, target);
      });
    }

    toggle.addEventListener('click', () => toggleCollapse(toggle, target));
  });
}

document.addEventListener('DOMContentLoaded', initCollapseToggles);