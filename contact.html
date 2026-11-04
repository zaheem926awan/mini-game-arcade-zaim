/**
 * Contact form handler (static-hosting friendly).
 *
 * The form posts to a Formspree endpoint set in the <form action="..."> attribute
 * of contact.html, so no server code is needed on GitHub / Vercel static hosting.
 *
 * - Validates the fields inline, with accessible error messages.
 * - Refuses to send if the form action is not a valid Formspree URL.
 * - Without JavaScript the form still submits normally to Formspree, with the
 *   browser's built-in validation.
 */
(function () {
  'use strict';

  const form = document.getElementById('contact-form');
  if (!form) return;

  const statusBox = document.getElementById('form-status');
  const submitBtn = document.getElementById('contact-submit');

  const ENDPOINT_PATTERN = /^https:\/\/formspree\.io\/f\/[A-Za-z0-9]+$/;
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const REQUEST_TIMEOUT_MS = 15000;

  const endpointOk = ENDPOINT_PATTERN.test(form.getAttribute('action') || '');
  const fallbackEmail = form.getAttribute('data-fallback-email') || '';
  const emailHint = fallbackEmail ? ' You can also email us at ' + fallbackEmail + '.' : '';

  // JavaScript takes over validation so messages appear next to each field.
  // (Without JavaScript this attribute is absent and the browser validates.)
  form.setAttribute('novalidate', '');

  // Field rules, checked in page order.
  const rules = [
    { name: 'name', ok: (el) => el.value.trim().length > 0, message: 'Please enter your name.' },
    { name: 'email', ok: (el) => EMAIL_PATTERN.test(el.value.trim()), message: 'Please enter a valid email address.' },
    { name: 'topic', ok: (el) => el.value !== '', message: 'Please choose a topic.' },
    { name: 'message', ok: (el) => el.value.trim().length >= 10, message: 'Please write a message of at least 10 characters.' },
    { name: 'consent', ok: (el) => el.checked, message: 'Please confirm that you have read the Privacy Policy.' }
  ];

  function errorBox(name) {
    return document.getElementById('err-' + name);
  }

  function showFieldError(el, message) {
    const box = errorBox(el.name);
    el.setAttribute('aria-invalid', 'true');
    el.style.borderColor = '#ff4757';
    if (box) {
      box.textContent = message;
      box.hidden = false;
    }
  }

  function clearFieldError(el) {
    const box = errorBox(el.name);
    el.removeAttribute('aria-invalid');
    el.style.borderColor = '';
    if (box) {
      box.textContent = '';
      box.hidden = true;
    }
  }

  /** Validates every field; returns the first invalid element, or null. */
  function validate() {
    let firstInvalid = null;
    rules.forEach((rule) => {
      const el = form.elements[rule.name];
      if (!el) return;
      if (rule.ok(el)) {
        clearFieldError(el);
      } else {
        showFieldError(el, rule.message);
        if (!firstInvalid) firstInvalid = el;
      }
    });
    return firstInvalid;
  }

  function showStatus(type, message, moveFocus) {
    statusBox.className = 'notice ' + type;
    statusBox.textContent = message;
    statusBox.classList.remove('hidden');
    if (moveFocus) statusBox.focus(); // only after a submit, never on page load
  }

  // Clear a field's error as soon as the visitor edits it.
  rules.forEach((rule) => {
    const el = form.elements[rule.name];
    if (!el) return;
    el.addEventListener('input', () => clearFieldError(el));
    el.addEventListener('change', () => clearFieldError(el));
  });

  /** Builds a readable message from a Formspree error response, if it sent one. */
  async function describeError(response) {
    try {
      const data = await response.json();
      if (data && Array.isArray(data.errors) && data.errors.length) {
        return data.errors.map((e) => e && e.message).filter(Boolean).join(' ');
      }
      if (data && typeof data.error === 'string') return data.error;
    } catch (e) {
      /* response was not JSON */
    }
    return '';
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitBtn.disabled) return; // already sending

    if (!endpointOk) {
      showStatus('error', 'This form is not set up correctly, so your message was not sent.' + emailHint, true);
      return;
    }

    // Honeypot: real visitors never fill this in. Pretend success and send nothing.
    const honeypot = form.elements['_gotcha'];
    if (honeypot && honeypot.value) {
      form.reset();
      showStatus('success', 'Thank you! Your message has been sent.', true);
      return;
    }

    const firstInvalid = validate();
    if (firstInvalid) {
      showStatus('error', 'Please correct the highlighted fields and try again.', false);
      firstInvalid.focus();
      return;
    }

    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
        signal: controller ? controller.signal : undefined
      });

      if (response.ok) {
        form.reset();
        rules.forEach((rule) => { const el = form.elements[rule.name]; if (el) clearFieldError(el); });
        showStatus('success', 'Thank you! Your message has been sent. We aim to reply within 12 hours.', true);
      } else {
        const detail = await describeError(response);
        showStatus('error', 'Sorry, your message could not be sent.' + (detail ? ' ' + detail : '') + emailHint, true);
      }
    } catch (err) {
      const timedOut = err && err.name === 'AbortError';
      showStatus(
        'error',
        (timedOut ? 'The request took too long.' : 'Network error. Please check your connection and try again.') + emailHint,
        true
      );
    } finally {
      if (timer) clearTimeout(timer);
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });
})();
