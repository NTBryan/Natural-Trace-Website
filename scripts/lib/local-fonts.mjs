/* ---------------------------------------------------------------------------
   Serve the real Montserrat to a headless browser.

   This exists because of a measurement that was confidently wrong. The layout
   audit blocked every off-site request, Google Fonts included, so every page it
   measured fell back to the system sans. Montserrat is wider than that fallback
   at the same size, so the audit reported the hero headline fitting its column
   with room to spare while it was wrapping onto three lines on a real machine.

   A layout check that measures the wrong typeface is not a layout check.

   @fontsource/montserrat ships the same files Google serves, from npm, so they
   can be handed to the browser locally without a network call. Attach this to a
   Playwright page before navigating.
--------------------------------------------------------------------------- */

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/* The weights the site actually asks for in base.njk. Anything not listed here
   would silently fall back, which is the bug this file exists to prevent. */
const WEIGHTS = [300, 400, 500, 600, 700, 800];

function fontDir() {
  return require.resolve('@fontsource/montserrat/package.json').replace(/package\.json$/, 'files/');
}

/* Nearest available cut. Fontsource ships 100 to 900 in hundreds, so this is
   normally an exact hit; it is here so a missing weight degrades to the closest
   real one rather than to the system font. */
function fileFor(weight) {
  return `${fontDir()}montserrat-latin-${weight}-normal.woff2`;
}

export function stylesheet(origin) {
  return WEIGHTS.map(w => `@font-face{
  font-family:'Montserrat';
  font-style:normal;
  font-weight:${w};
  font-display:block;
  src:url('${origin}/__fonts__/montserrat-${w}.woff2') format('woff2');
}`).join('\n');
}

/* Routes Google Fonts to the local copies and answers everything else off-site
   with an empty 204, so nothing waits on the network. */
export async function useLocalMontserrat(page, { allowPrefix, origin }) {
  await page.route('**/*', async route => {
    const url = route.request().url();

    if (url.startsWith(allowPrefix)) {
      const m = url.match(/\/__fonts__\/montserrat-(\d+)\.woff2$/);
      if (m) {
        return route.fulfill({
          status: 200,
          contentType: 'font/woff2',
          body: await readFile(fileFor(m[1])),
        });
      }
      return route.continue();
    }

    if (url.includes('fonts.googleapis.com')) {
      return route.fulfill({ status: 200, contentType: 'text/css', body: stylesheet(origin) });
    }

    return route.fulfill({ status: 204, body: '' });
  });
}
