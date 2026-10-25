// Star rating input: fills the stars up to the chosen (or hovered) one. The radios work without it.
(function () {
  var FILLED = 'text-accent-yellow';
  var EMPTY = 'text-border-strong';

  function paint(group, value) {
    group.querySelectorAll('[data-star]').forEach(function (label) {
      var icon = label.querySelector('[data-star-icon]');
      var on = Number(label.dataset.star) <= value;
      icon.classList.toggle(FILLED, on);
      icon.classList.toggle(EMPTY, !on);
    });
  }

  function checkedValue(group) {
    var checked = group.querySelector('input:checked');
    return checked ? Number(checked.value) : 0;
  }

  document.querySelectorAll('[data-star-input]').forEach(function (group) {
    group.addEventListener('change', function () {
      paint(group, checkedValue(group));
    });
    group.addEventListener('mouseover', function (event) {
      var label = event.target instanceof Element ? event.target.closest('[data-star]') : null;
      if (label) paint(group, Number(label.dataset.star));
    });
    group.addEventListener('mouseleave', function () {
      paint(group, checkedValue(group));
    });
  });
})();
