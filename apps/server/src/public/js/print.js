// Print buttons: <button data-print>. The SPA opens /certificates/:code?print=1 to print right away.
(function () {
  document.addEventListener('click', function (event) {
    var target = event.target instanceof Element ? event.target.closest('[data-print]') : null;
    if (target) window.print();
  });
  if (new URLSearchParams(window.location.search).get('print') === '1') {
    window.addEventListener('load', function () {
      window.print();
    });
  }
})();
