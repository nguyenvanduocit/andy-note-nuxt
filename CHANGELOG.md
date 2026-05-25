# Changelog

## [0.4.2](https://github.com/nguyenvanduocit/andy-note-nuxt/compare/v0.4.1...v0.4.2) (2026-05-25)


### Bug Fixes

* restore broader unicode-range coverage in font imports ([5173cfa](https://github.com/nguyenvanduocit/andy-note-nuxt/commit/5173cfa3c2587f19ffd67b71ff488ca673e6a19e))

## [0.4.1](https://github.com/nguyenvanduocit/andy-note-nuxt/compare/v0.4.0...v0.4.1) (2026-05-25)


### Performance

* prune fonts, parallelize content queries, eliminate font-swap CLS ([c7a95ad](https://github.com/nguyenvanduocit/andy-note-nuxt/commit/c7a95ad80f1d793dc51584cc285da3b83e5e9f13))

## [0.4.0](https://github.com/nguyenvanduocit/andy-note-nuxt/compare/v0.3.0...v0.4.0) (2026-05-25)


### Features

* integrate @nuxt/image for optimized markdown images ([01cf894](https://github.com/nguyenvanduocit/andy-note-nuxt/commit/01cf8949cce86e7152094d690384d513a345a876))

## [0.3.0](https://github.com/nguyenvanduocit/andy-note-nuxt/compare/v0.2.2...v0.3.0) (2026-05-25)


### ⚠ BREAKING CHANGES

* `app/app.config.ts` removed. Consumers using `defineAppConfig({ site: { ... } })` must move their overrides into `runtimeConfig.public.site` inside their own `nuxt.config.ts`:

### Features

* drop app.config.ts surface, move site config to runtimeConfig ([477eda9](https://github.com/nguyenvanduocit/andy-note-nuxt/commit/477eda9039438e82dfc2b326c24b3a9b43188ef0))


### Bug Fixes

* ship real favicon + logo SVG defaults, plug npm tarball leak ([404998d](https://github.com/nguyenvanduocit/andy-note-nuxt/commit/404998dbd854f0b827b478d8ebbc82f5dc053912))


### Documentation

* align doc surface — fontsource package, English seed content, npm ship caveat ([256ab1b](https://github.com/nguyenvanduocit/andy-note-nuxt/commit/256ab1b411836d68e2ed090fd509279b921e5574))

## [0.2.2](https://github.com/nguyenvanduocit/andy-note-nuxt/compare/v0.2.1...v0.2.2) (2026-05-25)


### Bug Fixes

* ship content.config.ts, drop dead menu config, correct theme-color meta ([cb94ec3](https://github.com/nguyenvanduocit/andy-note-nuxt/commit/cb94ec32e43fc7513ed29b95c31f04cbcb920e80))


### Documentation

* sync README + content docs with actual layer surface ([9ffb26d](https://github.com/nguyenvanduocit/andy-note-nuxt/commit/9ffb26d5a965333fe54016648a989cde898402ba))
