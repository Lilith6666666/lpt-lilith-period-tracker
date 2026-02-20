# Period Tracker (AI Dungeon Script Set)

A standalone AI Dungeon scripting set that tracks the player character's menstrual cycle phases and injects realistic phase-based cues into context.
Author: Lilith6666666

## Files
- `library.js`
- `input.js`
- `context.js`
- `output.js`

## Install
1. Open your scenario in AI Dungeon.
2. Go to `Advanced -> Scripting`.
3. Paste each file into the matching tab.
4. Save.

## Required Configuration (Story Card)
The script automatically creates a story card named `Period Tracker Config`.

Edit its `entry` values:

```txt
blood_intensity = 3
cramps_strength = 3
mood_swings = 3
ovulation_heat = y
```

Scale meaning:
- `1` = lowest
- `5` = highest

`ovulation_heat`:
- `y` = ovulation sexual drive cues can appear
- `n` = ovulation sexual drive cues should be suppressed

## Optional Configuration
```txt
cycle_length = 28
bleed_days = 5
turns_per_day = 25
```

## Commands
- `/period help`
- `/period status`
- `/period set blood <1-5>`
- `/period set cramps <1-5>`
- `/period set mood <1-5>`
- `/period set heat <y|n>`
- `/period set day <N>`
- `/period nextday [N]`

## Behavior
- Uses cycle day tracking where day 1 is the first bleeding day.
- Phases modeled: menstrual, follicular, ovulatory, luteal.
- Adds context guidance as threshold/intensity shifts rather than personality rewrites.
- Updates `Period Tracker Status` story card every turn.

## Notes
- This script follows `period_phase_reference.txt` (Version 1.0, 2026-02-15) as a general narrative reference.
- It is not medical advice.
