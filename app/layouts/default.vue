<template>
  <div class="h-screen flex flex-col overflow-hidden bg-terminal-bg text-terminal-text">
    <main class="flex-1 min-h-0 overflow-hidden">
      <slot />
    </main>
    <!--
      Toast host. Mounted client-only by vue-sonner's nuxt module so it never
      ships during SSR (toast lifecycle is purely interactive). Positioned
      bottom-right and capped at 3 visible toasts to keep the brutalist surface
      uncluttered — extra toasts queue underneath and rotate in as older ones
      time out. Theme overrides live in `app/assets/css/main.css` under
      `[data-sonner-toaster]`.
    -->
    <ClientOnly>
      <Toaster
        position="bottom-right"
        :visible-toasts="3"
        :duration="2200"
      />
    </ClientOnly>
  </div>
</template>
