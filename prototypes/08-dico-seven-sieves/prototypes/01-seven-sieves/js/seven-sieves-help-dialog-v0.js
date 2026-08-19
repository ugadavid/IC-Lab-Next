"use strict";

(function exposeHelpDialog(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SevenSievesHelpDialog = api;
}(typeof globalThis !== "undefined" ? globalThis : window, () => {
  const FOCUSABLE_SELECTOR = [
    "button:not([disabled])",
    "a[href]",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex=\"-1\"])",
  ].join(",");

  function createController({ button, layer, dialog, closeButtons, documentRef }) {
    let isOpen = false;
    let previousBodyOverflow = "";

    function focusableElements() {
      return [...dialog.querySelectorAll(FOCUSABLE_SELECTOR)].filter((element) => !element.hidden);
    }

    function open() {
      if (isOpen) return;
      isOpen = true;
      previousBodyOverflow = documentRef.body.style.overflow;
      documentRef.body.style.overflow = "hidden";
      layer.hidden = false;
      layer.setAttribute("aria-hidden", "false");
      button.setAttribute("aria-expanded", "true");
      (focusableElements()[0] || dialog).focus();
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      layer.hidden = true;
      layer.setAttribute("aria-hidden", "true");
      button.setAttribute("aria-expanded", "false");
      documentRef.body.style.overflow = previousBodyOverflow;
      button.focus();
    }

    function handleLayerClick(event) {
      if (event.target === layer) close();
    }

    function handleKeydown(event) {
      if (!isOpen) return;
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = focusableElements();
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (documentRef.activeElement === first || !dialog.contains(documentRef.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (documentRef.activeElement === last || !dialog.contains(documentRef.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }

    button.addEventListener("click", open);
    closeButtons.forEach((closeButton) => closeButton.addEventListener("click", close));
    layer.addEventListener("click", handleLayerClick);
    documentRef.addEventListener("keydown", handleKeydown);

    return Object.freeze({ open, close, handleLayerClick, handleKeydown, isOpen: () => isOpen });
  }

  return Object.freeze({ createController });
}));
