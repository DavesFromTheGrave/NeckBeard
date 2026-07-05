// Brand fonts, loaded and confirmed-ready before any scene draws text with
// them. Canvas text silently falls back to the default font if you start
// drawing before a @font-face finishes loading — this closes that race.
window.NB = window.NB || {};

NB.FONT_DISPLAY = "'Street Reich'";
NB.FONT_ACCENT = "'Ghost Theory'";
NB.FONT_ARCADE = "'Arcade Normal'";

NB.fontsReady = Promise.all([
  document.fonts.load("40px 'Street Reich'"),
  document.fonts.load("20px 'Ghost Theory'"),
  document.fonts.load("20px 'Arcade Normal'"),
]).catch((e) => console.warn('font load failed, falling back to system font', e));
