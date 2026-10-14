// Lilith Period Tracker v2.0.0 — Lilith6666666 (Alex), MIT.
// Official v1 Context opt-in: preserve the cache prefix and append only what fits.
// @cache-compatible
const modifier = (text) => LPT.hook("context", text, typeof stop === "undefined" ? undefined : stop);
modifier(text);
