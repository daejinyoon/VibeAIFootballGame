# Task: T01 Rename Plan and Decision Files

## Status: done

## Goal
Give every existing plan and decision document a short, recognizable English filename while preserving its date, then repair every repository link so the files remain navigable.

## Decision Summary
- Rename the 46 plan files and all 53 decision files using the exact map below. The new plan file created for this work already has a short English name and remains unchanged; the grill-me decision is included in the decision map.
- Keep file contents unchanged except for links/path references that point at renamed files. Do not rename phase folders or task files.

## Implementation

### I01. Rename plan and decision files

- Related Files:
  - `.memory/plans/*.md` :: plan history — rename according to the table; modify paths only where needed.
  - `.memory/decisions/*.md` :: decision history — rename according to the table; modify paths only where needed.

#### Details
- **Rename map**: each entry is `directory / old basename -> new basename`; keep the `.md` extension and original date prefix.

Plans:
| Old basename | New basename |
|---|---|
| `2026-10-21-football-game` | `2026-10-21-pixel-football` |
| `2026-10-21-retro-arcade-gameplay` | `2026-10-21-retro-football-gameplay` |
| `2026-10-22-3d-football-game` | `2026-10-22-3d-arcade-football` |
| `2026-10-22-3d-scene-visibility` | `2026-10-22-scene-visibility` |
| `2026-10-22-arcade-3d-match-polish` | `2026-10-22-match-gameplay-polish` |
| `2026-10-22-arcade-match-results-skills-and-replay` | `2026-10-22-match-results-skills-replay` |
| `2026-10-22-football-match-chunk-cache` | `2026-10-22-match-chunk-cache` |
| `2026-10-22-football-visual-optimization` | `2026-10-22-visuals-and-loading` |
| `2026-10-22-law-based-3d-football-rework` | `2026-10-22-football-rules-and-controls` |
| `2026-10-22-unified-3d-arcade-football` | `2026-10-22-unified-football-game` |
| `2026-10-23-football-game-controls-kits-skills` | `2026-10-23-controls-kits-and-skills` |
| `2026-10-23-football-game-overhaul` | `2026-10-23-gameplay-overhaul` |
| `2026-10-23-football-restarts-and-starting-skill` | `2026-10-23-restarts-and-opening-skill` |
| `2026-10-23-remaining-skill-3d-vfx` | `2026-10-23-skill-3d-effects` |
| `2026-10-23-six-skill-effects-and-match-fixes` | `2026-10-23-skill-effects-and-match-fixes` |
| `2026-10-23-skill-loadout-visuals-and-match-fixes` | `2026-10-23-skill-loadout-and-visual-fixes` |
| `2026-10-26-cosmos-profile-storage` | `2026-10-26-cloud-profile-storage` |
| `2026-10-26-entra-login-cloud-save` | `2026-10-26-login-and-cloud-save` |
| `2026-10-26-football-skill-fixes` | `2026-10-26-skill-activation-fixes` |
| `2026-10-26-football-tactics-and-skill-flow` | `2026-10-26-tactics-and-skills` |
| `2026-10-26-remove-world-split` | `2026-10-26-remove-split-screen` |
| `2026-10-26-skill-cooldown-and-rainbow-removal` | `2026-10-26-skill-cooldown-and-rainbow` |
| `2026-10-26-world-split-player-facing-azure-hosting` | `2026-10-26-player-facing-and-azure-hosting` |
| `2026-10-27-audio-match-balance` | `2026-10-27-match-audio-balance` |
| `2026-10-27-desktop-responsive-layout` | `2026-10-27-desktop-layout` |
| `2026-10-27-football-beta-feedback` | `2026-10-27-beta-feedback` |
| `2026-10-27-football-dev-presentation` | `2026-10-27-developer-presentation` |
| `2026-10-28-football-guide-gameplay-screen` | `2026-10-28-gameplay-guide` |
| `2026-10-29-campaign-3d-player-visibility-and-kit` | `2026-10-29-campaign-player-visibility-kit` |
| `2026-10-29-campaign-goal-kick-and-loose-ball-ai` | `2026-10-29-goal-kick-and-loose-ball-ai` |
| `2026-10-29-football-pvp-invite` | `2026-10-29-pvp-invite-matches` |
| `2026-10-29-local-dev-auth-bypass` | `2026-10-29-local-login-bypass` |
| `2026-10-30-field-boundary-running-animation` | `2026-10-30-boundary-running-animation` |
| `2026-10-30-goal-celebration-motion-polish` | `2026-10-30-celebration-motion` |
| `2026-10-30-goal-celebrations` | `2026-10-30-celebration-system` |
| `2026-11-02-cloud-profile-api-404` | `2026-11-02-profile-api-routing` |
| `2026-11-02-customization-ceremony-preview-fixes` | `2026-11-02-customization-and-ceremony-previews` |
| `2026-11-02-football-v1-release` | `2026-11-02-football-version-1-release` |
| `2026-11-02-goal-celebration-cinematic-camera` | `2026-11-02-celebration-camera` |
| `2026-11-02-opening-kickoff-teammate-pass` | `2026-11-02-opening-kickoff-passing` |
| `2026-11-02-profile-v8-api-compatibility` | `2026-11-02-profile-v8-compatibility` |
| `2026-11-02-rko-contact-face-up` | `2026-11-02-rko-contact-orientation` |
| `2026-11-02-rko-face-up-from-start` | `2026-11-02-rko-starting-orientation` |
| `2026-11-02-rko-finisher-lead-spacing` | `2026-11-02-rko-finisher-positioning` |
| `2026-11-02-rko-landing-spacing` | `2026-11-02-rko-landing-positioning` |
| `2026-11-02-rko-preview-staging` | `2026-11-02-rko-preview-formation` |

Decisions:
| Old basename | New basename |
|---|---|
| `2026-10-21-football-game` | `2026-10-21-pixel-football` |
| `2026-10-21-retro-arcade-gameplay` | `2026-10-21-retro-football-gameplay` |
| `2026-10-22-3d-football-game` | `2026-10-22-3d-arcade-football` |
| `2026-10-22-3d-scene-visibility` | `2026-10-22-scene-visibility` |
| `2026-10-22-arcade-3d-match-polish` | `2026-10-22-match-gameplay-polish` |
| `2026-10-22-arcade-match-results-skills-and-replay` | `2026-10-22-match-results-skills-replay` |
| `2026-10-22-football-match-chunk-cache` | `2026-10-22-match-chunk-cache` |
| `2026-10-22-football-visual-optimization` | `2026-10-22-visuals-and-loading` |
| `2026-10-22-law-based-3d-football-rework` | `2026-10-22-football-rules-and-controls` |
| `2026-10-22-match-timer-and-ai-movement` | `2026-10-22-match-timer-and-team-ai` |
| `2026-10-22-unified-3d-arcade-football` | `2026-10-22-unified-football-game` |
| `2026-10-23-direct-skill-preview` | `2026-10-23-skill-preview-matches` |
| `2026-10-23-football-game-controls-kits-skills` | `2026-10-23-controls-kits-and-skills` |
| `2026-10-23-football-game-overhaul` | `2026-10-23-gameplay-overhaul` |
| `2026-10-23-football-restarts-and-starting-skill` | `2026-10-23-restarts-and-opening-skill` |
| `2026-10-23-goal-kick-kit-match-fix` | `2026-10-23-goal-kick-formation-and-kits` |
| `2026-10-23-remaining-skill-3d-vfx` | `2026-10-23-skill-3d-effects` |
| `2026-10-23-simple-tackle-no-cards` | `2026-10-23-simple-tackles-no-cards` |
| `2026-10-23-six-skill-effects-overhaul` | `2026-10-23-skill-effects-overhaul` |
| `2026-10-23-skill-loadout-visuals-and-match-fixes` | `2026-10-23-skill-loadout-and-visual-fixes` |
| `2026-10-23-visible-skill-effects` | `2026-10-23-skill-preview-visibility` |
| `2026-10-26-cosmos-profile-storage` | `2026-10-26-cloud-profile-storage` |
| `2026-10-26-entra-login-cloud-save` | `2026-10-26-login-and-cloud-save` |
| `2026-10-26-football-skill-fixes` | `2026-10-26-skill-activation-fixes` |
| `2026-10-26-football-tactics-and-skill-flow` | `2026-10-26-tactics-and-skills` |
| `2026-10-26-remove-rainbow-reflect-and-skill-cooldown` | `2026-10-26-skill-cooldown-and-remove-rainbow` |
| `2026-10-26-remove-world-split` | `2026-10-26-remove-split-screen` |
| `2026-10-26-world-split-player-facing-azure-hosting` | `2026-10-26-player-facing-and-azure-hosting` |
| `2026-10-27-audio-match-balance` | `2026-10-27-match-audio-balance` |
| `2026-10-27-desktop-responsive-layout` | `2026-10-27-desktop-layout` |
| `2026-10-27-football-beta-feedback` | `2026-10-27-beta-feedback` |
| `2026-10-27-football-dev-presentation` | `2026-10-27-developer-presentation` |
| `2026-10-27-ydj-football-azure-target` | `2026-10-27-azure-deployment-target` |
| `2026-10-28-football-guide-gameplay-screen` | `2026-10-28-gameplay-guide` |
| `2026-10-29-3d-player-switch-visibility-and-kit` | `2026-10-29-player-switching-and-kit-visibility` |
| `2026-10-29-campaign-goal-kick-and-loose-ball-ai` | `2026-10-29-goal-kick-and-loose-ball-ai` |
| `2026-10-29-football-pvp-invite` | `2026-10-29-pvp-invite-matches` |
| `2026-10-29-local-dev-auth-bypass` | `2026-10-29-local-login-bypass` |
| `2026-10-30-field-boundary-running-animation` | `2026-10-30-boundary-running-animation` |
| `2026-10-30-goal-celebration-motion-polish` | `2026-10-30-celebration-motion` |
| `2026-10-30-goal-celebrations` | `2026-10-30-celebration-system` |
| `2026-11-02-cloud-profile-api-404` | `2026-11-02-profile-api-routing` |
| `2026-11-02-customization-ceremony-preview-fixes` | `2026-11-02-customization-and-ceremony-previews` |
| `2026-11-02-football-v1-release` | `2026-11-02-football-version-1-release` |
| `2026-11-02-goal-celebration-cinematic-camera` | `2026-11-02-celebration-camera` |
| `2026-11-02-memory-release-history-and-ai-kickoff` | `2026-11-02-memory-release-history-ai-kickoff` |
| `2026-11-02-opening-kickoff-teammate-pass` | `2026-11-02-opening-kickoff-passing` |
| `2026-11-02-profile-v8-api-compatibility` | `2026-11-02-profile-v8-compatibility` |
| `2026-11-02-rko-contact-face-up` | `2026-11-02-rko-contact-orientation` |
| `2026-11-02-rko-face-up-from-start` | `2026-11-02-rko-starting-orientation` |
| `2026-11-02-rko-finisher-lead-spacing` | `2026-11-02-rko-finisher-positioning` |
| `2026-11-02-rko-landing-spacing` | `2026-11-02-rko-landing-positioning` |
| `2026-11-02-rko-preview-staging` | `2026-11-02-rko-preview-formation` |

- **Reference update**: Search the repository for each old basename before and after the rename. Update Markdown links and plain path mentions in `.memory/current.md`, all plan files, phase files, task files, and decisions. Keep historical plan IDs inside commit-message blocks unchanged because they identify the original workflow, unless they are actual clickable file paths.
- **Collision handling**: Before moving any file, confirm its target does not exist. No target basename may be duplicated within its own directory. If the mapping has a collision, stop and report it rather than overwriting a document.
- **File-content constraints**: Do not translate or rewrite the documents' prose; only update paths that point to renamed files.

### I02. Link and repository validation
- Related Files:
  - `.memory/current.md` :: current plan pointer — update its target if referenced plan was renamed; modify.
  - `.memory/**/*.md` :: internal references — update every matching link/path; modify.
  - `git diff --check` output — ensure there are no malformed patches or whitespace errors; read-only.

#### Details
- For every rename-map pair, verify the new path exists and the old path no longer exists.
- Search for old basenames in Markdown after updating references; remaining occurrences are allowed only in this Task's mapping table and original plan/decision identifiers embedded in historical commit text, not in clickable links.
- Verify `.memory/current.md` still carries the pending authenticated profile-save smoke-check note while pointing at the new plan's first task.

## Acceptance Criteria
- [ ] All 46 old plan filenames and 53 decision filenames are renamed exactly as mapped.
- [ ] No target file overwrites another file; all Markdown links to renamed docs resolve.
- [ ] `.memory/current.md` points at the new active T01 while preserving the prior cloud-save smoke-check as a carry-over note.
- [ ] No document body is otherwise rewritten.

## Validation
- `git diff --check` — no whitespace errors.
- Run this PowerShell path check from the repository root — every old mapped path is absent and every mapped target exists:
  ```powershell
  $taskPath = '.memory/phases/2026-11-02-memory-release-history-and-ai-kickoff/P01-organize-history-and-fix-kickoff/T01-rename-memory-files.md'
  $text = Get-Content $taskPath -Raw -Encoding utf8
  $maps = [regex]::Match($text, '(?s)Plans:\s*(?<plans>.*?)\s*Decisions:\s*(?<decisions>.*?)\s*### I02')
  if (-not $maps.Success) { throw 'Rename map sections are missing.' }
  foreach ($section in @(@{name='plans'; body=$maps.Groups['plans'].Value}, @{name='decisions'; body=$maps.Groups['decisions'].Value})) {
    foreach ($pair in [regex]::Matches($section.body, '\| `(2026-[^`]+)` \| `(2026-[^`]+)` \|')) {
      $oldPath = Join-Path ".memory/$($section.name)" ($pair.Groups[1].Value + '.md')
      $newPath = Join-Path ".memory/$($section.name)" ($pair.Groups[2].Value + '.md')
      if (Test-Path $oldPath) { throw "Old path still exists: $oldPath" }
      if (-not (Test-Path $newPath)) { throw "New path is missing: $newPath" }
    }
  }
  ```
- `rg -n "<old basename>" .memory` for each old basename — no stale links; review allowed mapping/commit-ID mentions manually.

## Commit Message
```text
chore(memory): rename plan and decision files for clarity

Plan: 2026-11-02-memory-release-history-and-ai-kickoff
Phase: P01-organize-history-and-fix-kickoff
Task: T01-rename-memory-files

- Use short dated English names for all plan and decision files
- Update every internal reference and preserve the prior active follow-up
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending

## Result
- Renamed all 46 plan files and 53 decision files according to the map.
- Updated path references in 33 Markdown files; old `.md` path references no longer remain.
- PowerShell map check passed: every old path is absent and every mapped destination exists.
- `git diff --check -- .memory` passed; only line-ending warnings from Git attributes were emitted.
