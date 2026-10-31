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
          <div class="footer-brand"><span class="brand-bolt">⚡</span> NEO ARCADE</div>
          <p>A free collection of 10 browser mini-games. No downloads, no sign-up.</p>
          <nav class="footer-nav" aria-label="Footer">
            ${linkList(SITE_LINKS, null)}${linkList(LEGAL_LINKS, null)}
          </nav>
          <p class="footer-copy">&copy; <span data-year>${year}</span> Neo Arcade Vault. All rights reserved.</p>
        </footer>`;
    }
  };

  root.SiteShell = SiteShell;

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
