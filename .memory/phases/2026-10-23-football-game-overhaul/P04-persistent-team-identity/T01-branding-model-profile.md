# Task: T01 Branding Model and Profile Migration

## Status: done

## Goal
Define validated company-logo and kit-palette data, derive deterministic rival branding for all five stages, and persist the home team's selection without discarding existing campaign saves.

## Decision Summary
- Home branding is `{ logoId, paletteId }`; IDs are validated against four approved logos and six curated kit palettes.
- Rival branding is derived from stage and home branding, not saved as independent user selection. Existing profile data migrates forward with DEX/default-kit values.

## Implementation

### I01. Branding definitions and deterministic selectors
- Related Files:
  - `game/src/game/teamBranding.js` :: `LOGO_OPTIONS`, `KIT_PALETTES`, `DEFAULT_TEAM_CUSTOMIZATION`, `normalizeTeamCustomization()`, `getOpponentBranding()` — define the brand domain; new.
- Details
  - Export `LOGO_OPTIONS` for `dex`, `samsung`, `apple`, `google`, each with `{ id: string, displayName: string, assetPath: string }`.
  - Export six immutable home `KIT_PALETTES`, each `{ id: string, name: string, jersey: string, trim: string, shorts: string, boots: string }` with `#RRGGBB` values: `cyan-lime` (`#00A6C8`, `#B8F52A`, `#F4F7F8`, `#17212A`), `royal-gold` (`#2447B8`, `#F2C230`, `#F5F5F0`, `#252A38`), `forest-white` (`#16724A`, `#F5F4E8`, `#F7F7F2`, `#202820`), `crimson-ivory` (`#C72F3B`, `#F2D9B6`, `#F6F0E2`, `#292229`), `violet-ice` (`#7042A8`, `#A8E8F2`, `#E8F6F7`, `#24202E`), and `charcoal-gold` (`#30343B`, `#D4AF37`, `#F2F2EE`, `#17191E`). `DEFAULT_TEAM_CUSTOMIZATION = { logoId: 'dex', paletteId: 'cyan-lime' }`.
  - `normalizeTeamCustomization(value)` returns exactly `{ logoId, paletteId }`, using default IDs when fields are missing/invalid; never throw for corrupt local data.
  - `getOpponentBranding(stage, homeCustomization)` accepts integer stage `1..5` (invalid stage clamps to `1`), excludes the selected home `logoId`, maps remaining logo IDs by deterministic stage cycle `(stage - 1) % availableLogos.length`, and returns `{ logoId, displayName, kit }`.
  - Define immutable opponent palette candidates with `{ id, jersey, trim, shorts, boots }` hex fields: coral `#E94B55/#FFE2A6/#FFF2E5/#28242A`, blue `#2457D6/#6FE4FF/#F5F5F5/#20283A`, orange `#F07824/#FFE04A/#FFF7E8/#30251E`, green `#19804F/#A9EF58/#F4F4EC/#1E2922`, purple `#8A3DC2/#F4A8FF/#F4EEF7/#29202F`, boss-black `#17191D/#D8B23A/#E7E5DD/#090A0C`. For stages 1-4, rotate the five non-boss candidates by `(stage - 1) % 5` and choose the first jersey with RGB Euclidean distance >= `95` from the home jersey; if none qualifies, choose the candidate with the greatest distance, retaining rotated order to break ties. For stage 5 always use `boss-black`; the `charcoal-gold` home preset uses off-white shorts and gold trim to distinguish it from boss-black's light gray shorts and muted gold trim.
  - Keep selectors pure; do not read `window`, local storage, or random values.

### I02. Local profile schema version 3
- Related Files:
  - `game/src/storage/localProfile.js` :: `PROFILE_VERSION`, `createEmptyProfile()`, `migrateProfileV1()`, `migrateProfileV2()`, `readProfile()`, `writeProfile()` — preserve and add settings; modify.
  - `game/src/storage/localProfile.test.js` :: existing profile migration/storage cases — update existing cases only; modify.
- Details
  - Bump `PROFILE_VERSION` from `2` to `3`.
  - Add profile field `teamCustomization: { logoId: string, paletteId: string }` to `createEmptyProfile()` and `writeProfile()` output.
  - Add `migrateProfileV2(parsedProfile: object): ProfileV3`, retaining valid `nickname`, `campaignSave`, and `bestRecord`, setting `version: 3` and `teamCustomization: DEFAULT_TEAM_CUSTOMIZATION`. `readProfile()` dispatches v1 through the existing migration path and v2 through this function; both return v3. For schema version 1, preserve current campaign migration and add the same default.
  - For current version 3 reads, normalize `teamCustomization`; malformed customization falls back to defaults while valid `campaignSave` and `bestRecord` remain intact.
  - `writeProfile()` must preserve `campaignSave` and `bestRecord`, normalize the new field, and never reset campaign progress because a customization field is missing.

## Acceptance Criteria
- [x] `LOGO_OPTIONS` and six palette objects are immutable/exported and contain only valid hex values.
- [x] Rival logo cycle is deterministic, excludes the home logo, and repeats only after the remaining logo pool is exhausted.
- [x] Stages 1-4 select a contrasting rival palette; stage 5 is black/gold/light-shorts.
- [x] Schema v1/v2 profiles migrate to v3 with defaults while preserving valid campaign and record data.
- [x] Invalid logo/palette IDs normalize safely to DEX/cyan-lime.

## Validation
- `cd game; npm test -- src/storage/localProfile.test.js` — existing migration/read/write cases pass after assertions account for v3 branding.
- `cd game; npm run build` — module imports and profile code compile.
- Both validation commands passed.

## Commit Message
```text
feat(profile): persist team branding settings

Plan: 2026-10-23-football-game-overhaul
Phase: P04-persistent-team-identity
Task: T01-branding-model-profile

- Define validated team logos and kit palettes
- Migrate saved profiles without losing campaigns
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: `a9346a5`
