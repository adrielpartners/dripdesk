<template>
  <div class="shell">
    <header class="shell__header"><div class="shell__header-inner"><div class="shell__topline"><AppBrand /></div></div></header>
    <main class="shell__body">
      <slot />
    </main>
    <footer class="shell__footer"><span>Small lessons. Real momentum.</span><AppThemePicker /></footer>
  </div>
</template>
