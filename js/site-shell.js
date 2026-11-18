/**
 * Site Shell - shared navigation + footer markup.
 *
 * The static pages (about, contact, privacy-policy, terms, games, 404) ship
 * their own copy of this markup in plain HTML so they work without JavaScript.
 * The arcade portal (index.html) renders its views with JavaScript, so it uses
 * these helpers to output exactly the same links.
 *
 * To add / rename a page, update SITE_LINKS here AND the static HTML pages.
 */
(function (root) {
  const SITE_LINKS = [
    { label: 'Home', href: '/' },
    { label: 'Games', href: '/games' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' }
  ];

  const LEGAL_LINKS = [
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Terms & Conditions', href: '/terms' }
  ];

  function linkList(links, current) {
    return links
      .map(l => `<a href="${l.href}"${l.href === current ? ' aria-current="page"' : ''}>${l.label}</a>`)
      .join('');
  }

  const SiteShell = {
    SITE_LINKS,
    LEGAL_LINKS,

    /** Slim navigation strip rendered under the portal's own navbar. */
    subnavHTML(current) {
      return `
        <div class="site-subnav">
          <nav class="nav-links" aria-label="Site pages">${linkList(SITE_LINKS, current)}</nav>
        </div>`;
    },

    /** Footer shared by every page. */
    footerHTML() {
      const year = new Date().getFullYear();
      return `
        <footer class="arcade-footer site-footer">
          <div class="footer-brand"><svg class="vx-mark" viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" focusable="false"><rect width="32" height="32" rx="7" fill="var(--signal)"/><path fill="var(--ink-0)" d="M6 7h5v5H6zM21 7h5v5h-5zM9 12h5v5H9zM18 12h5v5h-5zM12 17h8v5h-8zM13 22h6v4h-6z"/></svg> NEO ARCADE</div>
          <p>A free collection of 10 browser mini-games. No downloads, no sign-up.</p>
          <nav class="footer-nav" aria-label="Footer">
            ${linkList(SITE_LINKS, null)}${linkList(LEGAL_LINKS, null)}
          </nav>
          <p class="footer-copy">&copy; <span data-year>${year}</span> Neo Arcade Vault. All rights reserved.</p>
        </footer>`;
    }
  };

  root.SiteShell = SiteShell;

  // Small-screen menu: one delegated handler serves every page (the portal renders its header with JS).
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('click', (e) => {
      const btn = e.target && e.target.closest ? e.target.closest('#nav-btn-menu') : null;
      if (!btn) return;
      const bar = btn.closest('.arcade-navbar');
      if (!bar) return;
      const open = !bar.classList.contains('is-open');
      bar.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
  }

  // Keep the copyright year current on the static pages.
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('DOMContentLoaded', () => {
      const year = String(new Date().getFullYear());
      document.querySelectorAll('[data-year]').forEach(el => { el.textContent = year; });
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SiteShell };
  }
})(typeof window !== 'undefined' ? window : globalThis);
