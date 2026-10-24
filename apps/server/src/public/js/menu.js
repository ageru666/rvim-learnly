// <details> dropdowns: close on Escape, on a click outside and when another one opens.
(function () {
  function dropdowns() {
    return Array.prototype.slice.call(document.querySelectorAll('details[data-dropdown]'));
  }

  function closeAll(except) {
    dropdowns().forEach(function (dropdown) {
      if (dropdown !== except) dropdown.open = false;
    });
  }

  document.addEventListener('click', function (event) {
    var target = event.target;
    var current = target instanceof Element ? target.closest('details[data-dropdown]') : null;
    closeAll(current);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    var open = dropdowns().filter(function (dropdown) {
      return dropdown.open;
    });
    closeAll(null);
    var summary = open.length > 0 ? open[0].querySelector('summary') : null;
    if (summary) summary.focus();
  });
})();
