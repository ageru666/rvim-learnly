// Confirmation for destructive forms: <form data-confirm="..." data-confirm-ok="..." data-confirm-cancel="...">.
// The texts are rendered by the server in the page language. Without JavaScript the form submits directly.
(function () {
  function buildDialog(form) {
    var dialog = document.createElement('dialog');
    dialog.className = 'card card-body max-w-md backdrop:bg-overlay';
    var message = document.createElement('p');
    message.className = 'mb-6';
    message.textContent = form.dataset.confirm;
    var actions = document.createElement('div');
    actions.className = 'flex justify-end gap-2';
    var cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'btn btn-outline';
    cancel.textContent = form.dataset.confirmCancel;
    var ok = document.createElement('button');
    ok.type = 'button';
    ok.className = 'btn btn-danger';
    ok.textContent = form.dataset.confirmOk;
    actions.append(cancel, ok);
    dialog.append(message, actions);
    cancel.addEventListener('click', function () {
      dialog.close();
    });
    ok.addEventListener('click', function () {
      dialog.close();
      form.dataset.confirmed = 'true';
      form.requestSubmit();
    });
    dialog.addEventListener('close', function () {
      dialog.remove();
    });
    return dialog;
  }

  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.dataset.confirm) return;
    if (form.dataset.confirmed === 'true') return;
    event.preventDefault();
    var dialog = buildDialog(form);
    document.body.append(dialog);
    dialog.showModal();
  });
})();
