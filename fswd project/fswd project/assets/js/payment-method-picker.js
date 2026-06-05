/**
 * Renders payment method chips (like selectable tiles).
 * container: element id or element
 * options: { hiddenInputId, defaultMethod, onChange(method) }
 */
function initPaymentMethodPicker(container, options) {
  const opts = options || {};
  const el = typeof container === "string" ? document.getElementById(container) : container;
  if (!el || typeof PAYMENT_OPTIONS === "undefined") return;

  const hiddenId = opts.hiddenInputId || "checkoutPaymentMethod";
  let hidden = document.getElementById(hiddenId);
  if (!hidden) {
    hidden = document.createElement("input");
    hidden.type = "hidden";
    hidden.id = hiddenId;
    hidden.name = opts.inputName || "paymentMethod";
    el.parentNode.insertBefore(hidden, el.nextSibling);
  }

  let selected = opts.defaultMethod || hidden.value || "cod";

  function render() {
    el.innerHTML = "";
    el.className = (el.className || "") + " payment-method-picker";
    el.setAttribute("role", "group");
    el.setAttribute("aria-label", "Payment method");

    PAYMENT_OPTIONS.forEach(function (opt) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "pay-chip " + opt.chipClass + (opt.id === selected ? " pay-chip-active" : "");
      btn.setAttribute("data-method", opt.id);
      btn.innerHTML =
        '<span class="pay-chip-title">' +
        opt.short +
        "</span>" +
        '<span class="pay-chip-label">' +
        opt.label +
        "</span>" +
        '<span class="pay-chip-hint">' +
        opt.hint +
        "</span>";

      btn.addEventListener("click", function () {
        selected = opt.id;
        hidden.value = selected;
        render();
        if (typeof opts.onChange === "function") {
          opts.onChange(selected);
        }
      });

      el.appendChild(btn);
    });

    hidden.value = selected;
  }

  render();
  return {
    getValue: function () {
      return hidden.value;
    },
    setValue: function (method) {
      selected = method;
      hidden.value = method;
      render();
    },
  };
}
