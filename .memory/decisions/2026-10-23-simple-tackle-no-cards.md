# Decision: Simple Tackles Without Cards

## Context
The current simulation treats forceful or rear tackles as fouls, awards free kicks or penalties, and can issue yellow or red cards. The desired arcade match loop should keep tackles direct and easy to read.

## Decisions
- Remove foul severity, foul stoppages, yellow cards, red cards, and dismissal as tackle outcomes.
- A valid tackle within the existing normal or powered range steals possession and keeps the existing tackle event and knockdown response.
- Preserve the powered tackle range and visual skill effect. Do not change pass, shot, goalkeeper, or restart behavior unrelated to tackles.
- Remove the match HUD foul notice because this simulation no longer produces foul notices.

## Acceptance
- Rear, sliding, and powered tackles do not emit foul, yellow-card, red-card, or dismissal events.
- The same valid tackle transfers the ball to the tackler and continues play.
- Existing tackle, possession, and knockdown feedback remains available.
