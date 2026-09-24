<template>
  <div class="auth-shell">
    <header class="auth-shell__header"><AppBrand /></header>
    <main class="auth-shell__main">
      <section class="auth-story" aria-labelledby="auth-story-title">
        <p class="page-header__eyebrow">A little learning. A lot of possibility.</p>
        <h1 id="auth-story-title">Small lessons.<br /><span>Big little<br />moments.</span></h1>
        <p class="auth-story__copy">Turn what you know into something that sticks. Send thoughtful lessons, one happy inbox at a time.</p>
        <AppDeliveryArt />
        <div class="auth-story__channels"><span>Email</span><span>SMS</span><span>Telegram</span><span aria-hidden="true">↗</span></div>
      </section>
      <div class="auth-shell__form">
        <p class="auth-shell__welcome">YOUR NEXT GOOD THING STARTS HERE</p>
        <slot />
        <p class="auth-shell__footnote">A home for your ideas. A little nudge for your people.</p>
      </div>
    </main>
    <footer class="auth-shell__footer"><span>Made for a little progress, every day. <span aria-hidden="true">✳</span></span><AppThemePicker /></footer>
  </div>
</template>

<style scoped>
.auth-shell { min-height: 100vh; border-top: 5px solid var(--dd-color-primary); }
.auth-shell__header { max-width: 80rem; margin: auto; padding: var(--dd-space-5) var(--dd-space-6); display: flex; align-items: center; justify-content: space-between; gap: var(--dd-space-4); }
.auth-shell__main { max-width: 76rem; margin: var(--dd-space-6) auto; display: grid; grid-template-columns: 1.1fr 1fr; align-items: center; gap: var(--dd-space-12); padding: 0 var(--dd-space-6); }
.auth-story { position: relative; padding: var(--dd-space-10); border: 1px solid var(--dd-color-ink); border-radius: var(--dd-radius-lg); background: var(--dd-color-primary-soft); background-image: radial-gradient(var(--dd-color-grid) 0.7px, transparent 0.7px); background-size: 12px 12px; }
.auth-story h1 { position: relative; margin: var(--dd-space-6) 0; font-size: clamp(2.8rem, 4.5vw, 4.7rem); font-weight: 800; line-height: 1.02; letter-spacing: -0.065em; }
.auth-story h1 span { text-decoration: underline; text-decoration-color: var(--dd-color-primary); text-decoration-thickness: 0.12em; text-underline-offset: 0.06em; }
.auth-story__copy { max-width: 30rem; font-size: var(--dd-font-size-lg); color: var(--dd-color-text-muted); }
.auth-story .delivery-art { width: 75%; margin: var(--dd-space-3) auto 0; }
.auth-story__channels { display: flex; flex-wrap: wrap; align-items: center; gap: var(--dd-space-2); font-family: var(--dd-font-mono); font-size: var(--dd-font-size-xs); }
.auth-story__channels span { border: 1px solid var(--dd-color-border-strong); border-radius: var(--dd-radius-pill); padding: var(--dd-space-1) var(--dd-space-3); background: var(--dd-color-surface); }
.auth-story__channels span:last-child { margin-left: auto; background: var(--dd-color-primary); border-color: var(--dd-color-ink); }
.auth-shell__form { min-width: 0; width: 100%; max-width: 30rem; justify-self: center; }
.auth-shell__welcome { font-family: var(--dd-font-mono); font-size: var(--dd-font-size-xs); letter-spacing: 0.12em; color: var(--dd-color-text-muted); margin-bottom: var(--dd-space-4); }
.auth-shell__form :deep(.app-card) { border-color: var(--dd-color-ink); box-shadow: var(--dd-shadow-button); }
.auth-shell__form :deep(.app-card__header) { background: var(--dd-color-surface); padding: var(--dd-space-6); }
.auth-shell__form :deep(.app-card__title) { font-size: 1.8rem; }
.auth-shell__form :deep(.app-card__body) { padding: var(--dd-space-6); }
.auth-shell__footnote { margin: var(--dd-space-6) 0 0; text-align: center; font-size: var(--dd-font-size-xs); color: var(--dd-color-text-muted); }
.auth-shell__footer { max-width: 76rem; margin: auto; padding: var(--dd-space-6); font-family: var(--dd-font-mono); font-size: var(--dd-font-size-xs); color: var(--dd-color-text-muted); display: flex; justify-content: space-between; }
.auth-shell__footer > span { color: var(--dd-color-text); }
.auth-shell__footer > span > span { font-size: var(--dd-font-size-xl); }
@media (max-width: 55rem) { .auth-shell__main { grid-template-columns: 1fr; gap: var(--dd-space-6); } .auth-story { padding: var(--dd-space-6); } .auth-story h1 { font-size: 2.5rem; } .auth-story h1 br:last-child { display: none; } .auth-story .delivery-art, .auth-story__channels { display: none; } .auth-story__copy { margin-bottom: 0; font-size: var(--dd-font-size-md); } .auth-shell__form { max-width: none; } }
@media (max-width: 30rem) { .auth-shell__header, .auth-shell__main, .auth-shell__footer { padding-left: var(--dd-space-4); padding-right: var(--dd-space-4); } .auth-story .page-header__eyebrow { font-size: 0.65rem; } }
</style>
