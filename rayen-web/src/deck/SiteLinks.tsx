/**
 * The way out of the app to the pages that say what it is.
 *
 * /about and /privacy are plain static pages that share this origin, so the first two
 * are ordinary same-origin links. In the installed home-screen app they navigate in
 * place — there is no back button — which is why both pages carry an "Open Rayen" link
 * home. The source link leaves for GitHub and so opens separately.
 *
 * It appears in two places only: the Backup sheet, which is where a person already goes
 * to find out what happens to their garden, and the empty garden, which is what someone
 * arriving from a search sees first and is the one screen that has room to explain
 * itself. A garden with plants in it has no spare line for a footer, and shouldn't.
 */
export function SiteLinks({ className = '' }: { className?: string }) {
  return (
    <nav className={`sitelinks ${className}`.trim()} aria-label="About Rayen">
      <a href="/about">About</a>
      <a href="/privacy">Privacy</a>
      <a href="https://github.com/wheredidfranciscogo/rayen" target="_blank" rel="noopener noreferrer">
        Source
      </a>
    </nav>
  );
}
