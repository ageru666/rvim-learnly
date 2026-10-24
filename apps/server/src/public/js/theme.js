// Instant theme switching. Without JavaScript the same forms POST to /theme and reload the page.
(function () {
  var STORAGE_KEY = 'learnly:v1:theme';
  var ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

  function remember(theme) {
    document.cookie = 'theme=' + theme + '; path=/; max-age=' + ONE_YEAR_SECONDS + '; samesite=lax';
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
    } catch {
      // Storage may be unavailable (private mode); the cookie is enough for the server.
    }
  }

  function markCurrent(dropdown, selectedForm) {
    dropdown.querySelectorAll('form[data-theme-form] button').forEach(function (button) {
      if (button.form === selectedForm) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
    var summaryIcon = dropdown.querySelector('summary svg');
    var selectedIcon = selectedForm.querySelector('svg');
    if (summaryIcon && selectedIcon) {
      var icon = selectedIcon.cloneNode(true);
      icon.setAttribute('width', summaryIcon.getAttribute('width'));
      icon.setAttribute('height', summaryIcon.getAttribute('height'));
      summaryIcon.replaceWith(icon);
    }
    dropdown.open = false;
  }

  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.hasAttribute('data-theme-form')) return;
    event.preventDefault();
    var theme = form.elements.namedItem('theme').value;
    document.documentElement.dataset.theme = theme;
    remember(theme);
    var dropdown = form.closest('details');
    if (dropdown) markCurrent(dropdown, form);
  });
})();
