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

function initCollapseToggles() {
  document.querySelectorAll('.collapse-toggle[data-toggle]').forEach(toggle => {
    if (toggle.dataset.collapseBound === 'true') return;
    const target = document.getElementById(toggle.dataset.toggle);
    if (!target) return;

    toggle.dataset.collapseBound = 'true';
    setCollapseState(toggle, target, loadCollapseState(toggle));

    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      setCollapseState(toggle, target, !expanded);
      saveCollapseState(toggle, !expanded);
    });
  });
}

document.addEventListener('DOMContentLoaded', initCollapseToggles);