/**
 * Contact form handler (static-hosting friendly).
 *
 * The form posts to a third-party form-backend endpoint (Formspree-compatible)
 * set in the <form action="..."> attribute of contact.html. No server code is
 * needed on GitHub / Vercel static hosting.
 *
 * Until the action still contains "YOUR_FORM_ID", the form refuses to send and
 * explains why, so visitors are never told a message was delivered when it was not.
 */
(function () {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const statusBox = document.getElementById('form-status');
  const submitBtn = document.getElementById('contact-submit');
  const endpointConfigured = !/YOUR_FORM_ID/.test(form.getAttribute('action') || '');

  function showStatus(type, message, moveFocus) {
    statusBox.className = 'notice ' + type;
    statusBox.textContent = message;
    statusBox.classList.remove('hidden');
    if (moveFocus) statusBox.focus(); // only after a submit, never on page load
  }

  if (!endpointConfigured) {
    showStatus(
      'warning',
      'The contact form is not connected yet. Please check back soon.'
    );
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!endpointConfigured) {
      showStatus('warning', 'The contact form is not connected yet, so this message was not sent.', true);
      return;
    }

    // Honeypot: real visitors never fill this in.
    const honeypot = form.querySelector('[name="_gotcha"]');
    if (honeypot && honeypot.value) return;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });

      if (response.ok) {
        form.reset();
        showStatus('success', 'Thank you! Your message has been sent. We will reply as soon as we can.', true);
      } else {
        showStatus('error', 'Sorry, your message could not be sent. Please try again later.', true);
      }
    } catch (err) {
      showStatus('error', 'Network error. Please check your connection and try again.', true);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });
})();
