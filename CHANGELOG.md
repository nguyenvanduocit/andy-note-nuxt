# Changelog

## [0.6.2](https://github.com/nguyenvanduocit/andy-note-nuxt/compare/v0.6.1...v0.6.2) (2026-06-09)


### Bug Fixes

* wrap long code, inline code, and table content in narrow columns ([e2eaeca](https://github.com/nguyenvanduocit/andy-note-nuxt/commit/e2eaecaff1d74c56137cc19c6796e26af5b4dee3))

## [0.6.1](https://github.com/nguyenvanduocit/andy-note-nuxt/compare/v0.6.0...v0.6.1) (2026-06-09)


### Bug Fixes

* exclude reserved /tags route from folder nav ([e1299d2](https://github.com/nguyenvanduocit/andy-note-nuxt/commit/e1299d2fa5a25b5a56fc98c178b3d04b0c13e035))

## [0.6.0](https://github.com/nguyenvanduocit/andy-note-nuxt/compare/v0.5.1...v0.6.0) (2026-06-04)


### Features

* ship SEO stack in the layer ([c6148e1](https://github.com/nguyenvanduocit/andy-note-nuxt/commit/c6148e1eaef30f4c09a165074db8f31a3680a5c7))

## [0.5.1](https://github.com/nguyenvanduocit/andy-note-nuxt/compare/v0.5.0...v0.5.1) (2026-05-29)


### Bug Fixes

* highlight drilled article in tag listing ([84db6c5](https://github.com/nguyenvanduocit/andy-note-nuxt/commit/84db6c59d4dfbfef1b5cad0f112a8283fba45331))

## [0.5.0](https://github.com/nguyenvanduocit/andy-note-nuxt/compare/v0.4.3...v0.5.0) (2026-05-29)


### Features

* add tag listing pages at /tags/&lt;slug&gt; with optional curated index ([43af2ff](https://github.com/nguyenvanduocit/andy-note-nuxt/commit/43af2ff48828e85315021e71375d4de32226a53c))


### Bug Fixes

* coerce non-string tags in toKebab to survive numeric YAML tags ([1f3c4a1](https://github.com/nguyenvanduocit/andy-note-nuxt/commit/1f3c4a19eb65a39a487679ce48e5e53d8dba0986))

## [0.4.3](https://github.com/nguyenvanduocit/andy-note-nuxt/compare/v0.4.2...v0.4.3) (2026-05-26)


### Bug Fixes

* correct optical alignment of section header slash glyph ([05d76d7](https://github.com/nguyenvanduocit/andy-note-nuxt/commit/05d76d77ad21cbc2100acd952ef476e5e6c35e44))


### Documentation

* document font import rule and fallback metric overrides ([51788de](https://github.com/nguyenvanduocit/andy-note-nuxt/commit/51788de4a6955e4ebeb01ccf99ef8e5bd10ec8bc))

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
