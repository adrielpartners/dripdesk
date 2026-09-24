<template>
  <svg class="delivery-art" viewBox="0 0 340 230" fill="none" aria-hidden="true">
    <path class="delivery-art__trail" d="M28 173c-36-75 107-88 113-19 4 45-83 58-71 0 10-51 118-23 144-63" stroke="var(--dd-color-border-strong)" stroke-width="2" stroke-dasharray="5 7" stroke-linecap="round" />
    <g class="delivery-art__envelope">
      <rect x="93" y="57" width="157" height="112" rx="12" transform="rotate(-9 93 57)" fill="var(--dd-color-ink)" />
      <rect x="88" y="50" width="157" height="112" rx="12" transform="rotate(-9 88 50)" fill="var(--dd-color-primary)" stroke="var(--dd-color-ink)" stroke-width="2" />
      <path d="m90 55 86 50 66-74M106 157l45-65m98 43-61-47" stroke="var(--dd-color-ink)" stroke-width="2" stroke-linejoin="round" />
      <circle cx="170" cy="115" r="25" fill="var(--dd-color-surface)" stroke="var(--dd-color-ink)" stroke-width="2" />
      <path d="M159 119q11 13 22-1" stroke="var(--dd-color-ink)" stroke-width="2" stroke-linecap="round" />
      <circle cx="162" cy="110" r="2" fill="var(--dd-color-ink)" /><circle cx="179" cy="108" r="2" fill="var(--dd-color-ink)" />
    </g>
    <path d="m276 132 5 14 15 4-15 5-5 14-5-14-14-5 14-4Z" fill="var(--dd-color-lilac)" stroke="var(--dd-color-ink)" stroke-width="1.5" />
    <path d="m57 39 3 10 10 3-10 3-3 10-3-10-10-3 10-3Z" fill="var(--dd-color-peach)" stroke="var(--dd-color-ink)" stroke-width="1.5" />
    <path d="m274 47 15-9m-12 23 20 2M259 34l4-15" stroke="var(--dd-color-ink)" stroke-width="2" stroke-linecap="round" />
    <g transform="rotate(7 224 198)">
      <rect x="141" y="181" width="164" height="31" rx="15.5" fill="var(--dd-color-surface)" stroke="var(--dd-color-ink)" />
      <text x="223" y="201" text-anchor="middle" fill="var(--dd-color-ink)" font-size="11" font-family="var(--dd-font-mono)">a little goes a long way</text>
    </g>
  </svg>
</template>

<style scoped>
.delivery-art { display: block; width: 100%; max-width: 25rem; overflow: visible; }
.delivery-art__envelope { transform-origin: center; animation: delivery-bob 900ms ease-out both; }
@keyframes delivery-bob { from { opacity: 0; transform: translateY(12px) rotate(4deg); } to { opacity: 1; transform: none; } }
</style>
