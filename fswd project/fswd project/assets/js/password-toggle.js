/**
 * Wraps password inputs with a show/hide toggle (eye button).
 * Mark fields with class "js-password-toggle" or attribute data-password-toggle.
 */
(function () {
  var EYE_OPEN =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  var EYE_CLOSED =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

  function wrapPasswordInput(input) {
    if (!input || input.type !== "password" || input.closest(".password-toggle-group")) {
      return;
    }

    var group = document.createElement("div");
    group.className = "input-group password-toggle-group";

    var parent = input.parentNode;
    parent.insertBefore(group, input);
    group.appendChild(input);

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-outline-secondary password-toggle-btn";
    btn.setAttribute("aria-label", "Show password");
    btn.setAttribute("aria-pressed", "false");
    btn.innerHTML = EYE_OPEN;

    btn.addEventListener("click", function () {
      var visible = input.type === "text";
      input.type = visible ? "password" : "text";
      btn.setAttribute("aria-pressed", visible ? "false" : "true");
      btn.setAttribute("aria-label", visible ? "Show password" : "Hide password");
      btn.innerHTML = visible ? EYE_OPEN : EYE_CLOSED;
    });

    group.appendChild(btn);
  }

  function initPasswordToggles(root) {
    var scope = root || document;
    var selector =
      'input[type="password"].js-password-toggle, input[type="password"][data-password-toggle]';
    scope.querySelectorAll(selector).forEach(wrapPasswordInput);
  }

  window.initPasswordToggles = initPasswordToggles;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initPasswordToggles();
    });
  } else {
    initPasswordToggles();
  }
})();
