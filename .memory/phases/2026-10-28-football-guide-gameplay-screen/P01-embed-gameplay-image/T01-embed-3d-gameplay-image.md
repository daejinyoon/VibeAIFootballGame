# Task: T01 Embed 3D Gameplay Image

## Status: done

## Goal
Update `C:/Users/DEX/Downloads/ydj-football-arcade-guide.html` so its match-screen section shows the chosen 3D stadium preview image instead of the CSS-drawn 2D field mockup, and clearly labels the image as a 2026-10-22 preview.

## Decision Summary
- Use `C:/Users/DEX/Desktop/윤대진AI/game/stadium-preview.png`, selected by the user. This is a historical preview image, not a capture of the currently deployed release.
- Embed the PNG bytes as a `data:image/png;base64,...` source so the Downloads HTML remains self-contained when opened with `file:///`.
- Replace the `.mock` illustration in the existing screen overview section; keep the explanatory screen list and add a visible source/date caption.

## Implementation

### I01. Replace the mock field with the embedded preview

- Related Files:
  - `C:/Users/DEX/Downloads/ydj-football-arcade-guide.html` :: `.screen-layout`, `.mock`, and the `#screen` section — modify; the HTML file currently uses a CSS stadium field and player dots instead of an image.
  - `C:/Users/DEX/Desktop/윤대진AI/game/stadium-preview.png` :: PNG asset — read-only source; use these exact bytes.

#### Details
- **Signatures & Types**: No application functions or data models change. The HTML image element must use `src="data:image/png;base64,{base64(PNG bytes)}"`, `alt="DEX Football Arcade 3D 경기장 미리보기"`, and a stable class such as `gameplay-preview`.
- **Data & Schema Fields**: None. Preserve the HTML document's UTF-8 encoding and its existing content.
- **Execution Flow / Logic**:
  1. Read the existing `#screen` section and replace only its `.mock` DOM block with a `<figure>` containing the embedded PNG `<img>` and a Korean caption that says `2026.10.22 경기장 미리보기 · 현재 배포 화면과 다를 수 있습니다.`
  2. Add responsive CSS for the figure/image using the existing `.screen-layout` column, `width: 100%`, a bounded aspect ratio consistent with the source image, `object-fit: contain`, and the existing rounded border/shadow treatment.
  3. Remove only mock-specific CSS rules (`.mock`, `.mock::before`, `.mock::after`, `.mock-score`, `.mock-pause`, `.mock-sound`, `.mock-mid`, `.player`, `.mock-mini`) and their media-query references when no longer used elsewhere. Keep `.screen-layout` and `.screen-list` styles.
  4. Keep all other guide sections, script behavior, typography, navigation, and the existing hero artwork unchanged.
  5. Ensure the image source has no file-system path or remote URL; all image bytes must be contained in the HTML.
- **Error & Exception Handling**: If the PNG cannot be read or the HTML cannot be written as UTF-8, stop before replacing the target. Do not substitute the older presentation crop or synthesize a screenshot.
- **State Transition & Return**: The standalone guide opens with the 3D image in its existing screen overview section.

## Acceptance Criteria
- [ ] The `#screen` section contains the embedded selected PNG with descriptive alt text and a visible 2026-10-22 source/date caption.
- [ ] The `.mock` field and player-dot elements are gone, while the explanatory `screen-list` remains.
- [ ] The image is embedded as a data URI, so opening the HTML does not depend on a sibling image file.
- [ ] Existing guide text, navigation, and controls remain intact.

## Validation
- PowerShell static validation — decode the embedded PNG data URI, compare its bytes with `game/stadium-preview.png`, and check the historical caption, removed mockup, and preserved screen list; all checks pass.
- `git diff --check` — no whitespace errors in the in-repository workflow files.

## Commit Message
```text
docs(memory): complete 3D guide preview task

Plan: 2026-10-28-football-guide-gameplay-screen
Phase: P01-embed-gameplay-image
Task: T01-embed-3d-gameplay-image

- Record the selected historical preview and standalone embedding approach
- Record completion of the external guide HTML update
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: included in task commit
