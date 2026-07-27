/**
 * The one definition of the chrome surface.
 *
 * Every floating control — the search field, the filters button, the legend,
 * the zoom stack, the rail and its handle — is the same sheet of glass over the
 * map, so they have to be literally the same declarations rather than four
 * hand-copied approximations. They had already drifted to four different tints
 * (65%, 70%, 80% white) and three different shadows, which read as several
 * unrelated widgets sharing a screen.
 *
 * Split out of GlassPanel because two of the consumers are `<button>`s and
 * cannot wrap themselves in a div.
 */
export const GLASS_TINT = 'bg-white/65 border border-white/60';

/** Drop shadow plus the top inset highlight that gives the sheet an edge. */
export const GLASS_SHADOW =
  'shadow-[0_8px_32px_rgba(34,49,63,0.12),inset_0_1px_0_rgba(255,255,255,0.7)]';

/**
 * Kept to the few large surfaces this file names. Applying backdrop-filter
 * per-item — every list row, every chip — multiplies compositor work and is the
 * usual cause of glassmorphism jank.
 */
export const GLASS_BLUR = 'backdrop-blur-xl';

export const GLASS_SURFACE = `${GLASS_BLUR} ${GLASS_TINT} ${GLASS_SHADOW}`;
