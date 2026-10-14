<p align="center"><img src="./assets/lpt-cover.jpg" alt="LPT — Lilith Period Tracker, illustrated Alex in a navy hoodie at a cozy desk" width="100%"></p>

# Lilith Period Tracker (LPT)

**v2.0.0 · Patch notes for your fictional body.**

Made by Lilith6666666 (Alex)

I made LPT because a character's body shouldn't vanish from the story just because the plot got distracted by a suspicious basement. It keeps a small cycle dashboard and gives the AI appropriate bodily cues. You keep the character, the agency, and the questionable basement decisions.

This is fictional roleplay/simulation tooling, **not a medical device, medical guidance, or a real-world fertility predictor**. Characters who menstruate or can become pregnant are welcome; nothing here makes assumptions about the player.

## What it actually does

- Tracks menstrual, follicular, ovulatory and luteal phases, with configurable days and pacing.
- Creates **two Story Cards**: editable Configuration and a readable Cycle Status. Pregnancy mode adds a third.
- Sends concise, phase-aware guidance with subtle, balanced or immersive intensity. Bleeding cues belong to menstrual days.
- Optionally tracks up to 16 saved characters, with independent pregnancies and manual week controls. No automatic conception or delivery.
- Migrates recognized v1 saves and cards, preserves config comments, and keeps technical notices out of story prose.
- Previews the next state in Context and commits on a matching successful Output. Duplicate hooks and same-counter retries do not count twice.

Local sandbox checks are automated. Adventure Scripts attachment, Optimized Context and upstream combinations are **not live-tested**; see [manual acceptance checks](./docs/MANUAL-TESTS.md). “The AI might remember your cramps” is a promise I can defend. “The AI will flawlessly portray them” would be creative writing of a different sort.

## Get started

### Players: attach an Adventure Script

AI Dungeon's Adventure Scripts feature lets creators mark a scripted scenario as a **Script**, and players attach, reorder or toggle Scripts on scenarios and adventures. Once the creator publishes this version there, save/bookmark the LPT Script and attach it through your adventure's Scripts controls. Generate an ordinary turn, then open Story Cards and look for type **Lilith Period Tracker**.

**This repository supplies the script files; it does not yet provide a verified published AI Dungeon Script link.** Updating GitHub does not update a published Script automatically. The creator must publish it; players do not need to merge JavaScript when using that published Script.

### Creators: publish once, or install manually

1. Open a scenario you own. In **Details**, open **Scripting** (enable scripts if needed).
2. Paste each complete root file into its matching tab: [library.js](./library.js) → Library, [input.js](./input.js) → Input, [context.js](./context.js) → Context, [output.js](./output.js) → Output.
3. Save, play a test adventure and run the [manual checks](./docs/MANUAL-TESTS.md).
4. Use Adventure Scripts to mark the scripted scenario as a Script and publish it through AI Dungeon's publishing flow. Share its actual Script link with players.

Library is shared by the three hooks. Each hook has exactly one modifier. These files need no package installation, runtime imports, network calls, or other time tracker. For legacy manual installation alongside other scripts, a creator must compose calls inside one modifier per tab; attaching independent Adventure Scripts avoids requiring players to merge code. Never paste two complete modifiers into one legacy tab.

## How it works

Day 1 starts bleeding. Defaults are a 28-day cycle, 5 menstrual days and **25 successful narrative generations per day**. Commands don't count. A failed/blank generation doesn't count. Turning LPT off freezes it; turning it back on resumes without catching up on missed turns.

Ovulation is approximated relative to the next cycle, with adjustments that keep all four phases valid even at the shortest/longest supported settings. This is narrative scheduling, not clinical biology. For the default cycle: menstrual days 1–5, follicular 6–11, ovulatory 12–16, luteal 17–28.

On the generation that crosses a boundary, Context prepares the new phase; Output commits it only after a nonblank result with the same action counter and unchanged settings/state. The AI receives possibilities and scene-appropriate instructions, never a compulsory symptom sentence. LPT preserves story output exactly.

**Host limits:** `info.actionCount` is a total action count, not a guaranteed unique generation ID. Automatic progression requires it to be present and consistent between Context and Output. Missing/mismatched counters freeze that advance. Same-counter retries are deduplicated; changed-counter retries, unmarked third-party maintenance and deep Undo cannot be identified perfectly. Verify the real lifecycle in your setup before relying on pacing. [Technical contract and evidence](./docs/API-RESEARCH.md).

## Your dashboard

All managed cards share type **Lilith Period Tracker**. Identity uses sentinel keys, not titles; titles are friendly when optional metadata is available. The Entry heading always identifies the card.

| Card | What you do |
| --- | --- |
| Configuration | Edit values after `=`; `#` comments explain every option. Leave sentinel keys/type intact. |
| Cycle Status | Read the day, phase, possible feelings and days to the next cycle. Status is managed by LPT. |
| Pregnancy, after enabling | Edit the character register; read the generated status below it. |

Unusual sentinel keys keep unpinned cards out of ordinary trigger matching. **Leave Configuration and Pregnancy unpinned.** For optional Story Card delivery, pin only Cycle Status and choose `context_delivery = storycard`; its Entry becomes compact AI guidance instead of the normal dashboard. `/lpt status` still shows the readable cycle snapshot.

LPT never pins/unpins cards itself or changes another script's cards. Card indexes are re-found before writing. Ambiguous old cards and foreign/duplicate sentinel conflicts are retained with a diagnostic rather than overwritten.

## Configuration

Edit the Configuration **Entry** between turns, or use `/lpt set`. Reads never reformat it. Commands patch a single line while preserving comments, unknown settings, order, whitespace and line endings. `key: value` works too. Keys and choice values ignore case. Full-line `#` comments are supported; inline comments are not.

| Setting | Default | Valid values / purpose |
| --- | --- | --- |
| `blood_intensity` | `3` | `1–5`, very light → very heavy menstrual bleeding |
| `cramps_strength` | `3` | `1–5`, minimal → severe menstrual cramps |
| `mood_swings` | `3` | `1–5`, possible emotional sensitivity; never personality replacement |
| `ovulation_heat` | `y` | `y/n`, optional attraction cues; no forced sexual themes |
| `cycle_length` | `28` | `21–35` days |
| `bleed_days` | `5` | `2–10` days at cycle start |
| `turns_per_day` | `25` | `1–200` eligible narrative generations |
| `pregnancy_mode` | `n` | `y/n`, opt in; disabling freezes pregnancy data |
| `narrative_intensity` | `balanced` | `subtle`, `balanced`, `immersive` |
| `phase_notifications` | `y` | `y/n`, natural phase/new-cycle notices |
| `pregnancy_notifications` | `y` | `y/n`, trimester/due notices |
| `context_delivery` | `auto` | `auto`, `standard`, `storycard` |
| `pregnancy_length_turns` | `400` | `40–40000`; applies when each pregnancy starts |

```text
/lpt set cramps 4
/lpt set heat n
/lpt set narrative_intensity subtle
/lpt set turns_per_day 10
/lpt set pregnancy_mode y
```

Malformed values produce diagnostics and retain the last valid value, or the default on first install. Duplicate known settings are rejected; fix both lines before a command can update that setting. Missing options inherit last valid settings in an existing save, otherwise defaults. Unknown settings are preserved and ignored. Configuration is bounded to 16 KiB.

Shortening cycle length clamps a now-out-of-range day to the final day. Changing turns/day proportionally preserves completed partial-day progress, rounded down. Manual day changes retain that progress. Setting changes and manual corrections establish a fresh checkpoint baseline; they are not undone through narrative Undo.

## Commands

Use a deliberate **whole action** in Story input. Outer whitespace and verb case don't matter. The documented Do prefix `> You /lpt ...` is accepted; a Say wrapper, dialogue or incidental `/lpt` mention is not a command. Extra arguments and malformed syntax give an error. Other slash commands pass through unchanged and don't count as LPT story turns.

| Command | Result |
| --- | --- |
| `/lpt help` or `/lpt` | Command reference |
| `/lpt status` | Readable cycle snapshot |
| `/lpt set blood 3` | Set `blood_intensity` |
| `/lpt set cramps 4` | Set `cramps_strength` |
| `/lpt set mood 5` | Set `mood_swings` |
| `/lpt set heat y` | Set `ovulation_heat` |
| `/lpt set day 12` | Set cycle day within current cycle length |
| `/lpt set <configuration_key> <value>` | Set any table option |
| `/lpt nextday` or `/lpt nextday 3` | Move 1 or 3 cycle days; accepts `1–365`, wraps safely |
| `/lpt pregnancyStart = Alex` | Register/start Alex; an already-active pregnancy keeps its progress |
| `/lpt pregnancyEnd = Alex` | End tracking; no narrative event implied |
| `/lpt pregnancyStatus = Alex` | Read Alex's pregnancy status |
| `/lpt pregnancyStatus = Alex,12` | Set Alex to Week 12 |
| `/lpt pregnancyStatus = 12` | Set registered pregnant `player` to Week 12 |
| `/lpt debugContext` | Show exact current prepared guidance and route, **not proof of model delivery** |

Pregnancy commands require mode enabled. Names may contain spaces, e.g. `/lpt pregnancyStart = Samira Vale`. `player` is the protagonist; use `"Player"` for an NPC literally named Player. Name matching ignores case but keeps display spelling. Names are limited to 64 characters, with no control characters, markup, commas or `=`. No active registered pregnancy gives a useful error for end/status/week commands.

Commands request the native `stop: true` path and report through `state.message` and script logs. They keep the input text and never substitute control receipts into Output. **The legacy help page warns that stopped Input can show a script error.** Current attached-Script command behavior needs live checking. If that happens, use card edits and inspect logs/status; don't repeatedly submit a mutating command to chase a popup. An occupied external notification is preserved, so your receipt may appear only in logs.

## Pregnancy mode: optional, explicit, multi-character

Enable `pregnancy_mode = y`. The new card contains this editable region:

```text
# [EDITABLE CHARACTERS]
player = capable
Alex = pregnant
Samira Vale = capable
# [/EDITABLE CHARACTERS]
```

`capable` is eligibility only. `pregnant` explicitly starts tracking at Week 1. You can start an unregistered character by command, which adds its line. Change a pregnant line to `capable` or use `pregnancyEnd` to end tracking. Comments and content outside the generated status region survive updates. Unknown free-text **inside the register** is an error; place your notes outside it or on `#` lines. Invalid/duplicate registers are rejected as a whole, retaining existing runtime tracking.

Pregnancies advance independently on eligible story generations. Duration is **fixed per pregnancy at its start**; changing the default affects future starts only. Week is `min(40, 1 + floor(40 × completed_turns / duration))`. At 400 turns, each week spans about 10 turns: Week 1 begins at 0, Week 12 at 110, Week 40 at 390. **Due** is reached at 400, then numeric progression caps. A manual week uses `ceil((week − 1) × duration / 40)` and resumes from there. Trimester boundaries are Weeks 14 and 28.

A player pregnancy pauses the cycle at its saved day and partial progress. Ending tracking resumes exactly there, without an assumed biological outcome. NPC pregnancies leave the player's cycle alone. Disabling pregnancy mode preserves the card, registers and all progress, suppresses new pregnancy cues, and freezes gestation; an active player pregnancy still keeps the cycle paused. Re-enable before ending it by command.

Removing a registration freezes that character while retaining its saved record; re-add the same pregnant status to resume. An active player remains cycle-paused until explicitly ended. The 16-character limit includes removed saved records; reuse records rather than cycling through unlimited names. The prompt includes the player and at most four active NPC pregnancies; all records remain on the dashboard. Nothing infers conception from fiction, assigns symptoms to unregistered characters, or generates childbirth.

## Context delivery and Optimized Context

- **auto / standard:** append a small dynamic guidance block to supplied Context. Preserve the existing prefix and fit within `info.maxChars` when supplied; if it won't fit, leave upstream context intact and report it. Auto chooses this conservative route regardless of model name or pin state.
- **storycard:** use the explicitly player-pinned Cycle Status card and skip direct injection. An absent/unpinned card falls back to the suffix. LPT never claims a successful pin or changes pin limits/preferences.

The Context hook opts into the officially documented `// @cache-compatible` directive. `info.useCacheEfficient === true` changes the debug explanation; it does not magically prove the suffix reached the model. Scenario pinning is documented; attached-Script permissions, timing of card refresh versus context construction, and actual inclusion remain unverified. Card mode may deliver the previous committed state on some hosts. Switch back to `standard` if View Context shows stale/missing guidance.

Run `/lpt debugContext` to see prepared **current** guidance. Generate a story turn and inspect AI Dungeon's **View Context** or the creator's scripting **Inspect** panel; check the actual LPT phase and count occurrences. Direct Context uses the upcoming state at a boundary; debug outside generation shows current committed state. Don't pin the status card in auto/standard if you want to avoid duplicate descriptive facts. See [research](./docs/API-RESEARCH.md) and [manual checks](./docs/MANUAL-TESTS.md).

## Playing nicely with others

[Auto-Cards](https://github.com/LewdLeah/Auto-Cards) and [Inner Self](https://github.com/LewdLeah/Inner-Self) are separate projects by LewdLeah. Their current READMEs and relevant hook code were reviewed. Inner Self includes optional integrated Auto-Cards; enabling that plus standalone Auto-Cards may overlap upstream automation. Avoid that combination unless you know why you need both.

LPT uses `state.lpt`, owns only its sentinel/type cards, preserves text and upstream stop flags, and never edits Plot Essentials, notes, third-party state or third-party pins. Shared messages are skipped when occupied. Sandbox mocks cover LPT alone, foreign cards/state, command namespaces, reordered cards and cooperative/conflicting stop/message behavior; they do **not** execute the full upstream engines or prove live compatibility.

Unmarked background model calls cannot be distinguished reliably from story generation. A known slash-control input or upstream `stop` prevents progress; a maintenance call that looks ordinary to the host may still count. Script order matters: an upstream script can replace context/output or raise stop after LPT has run. Put LPT after upstream control handling where possible, and test both orders. No “fully compatible” badge has been conjured from the basement.

## Upgrading from v1

Back up your adventure/state and Story Cards. Replace all four hooks together or update the attached published Script through AI Dungeon's normal workflow. Don't run the old and new trackers together.

On first successful migration, `state.periodTracker` becomes a schema-2 `state.lpt` snapshot: day is preserved within the configured length; historical turn progress becomes `turn_counter % turns_per_day`. Legacy state is retained and never reused while valid v2 state exists. Malformed or future-version state is preserved with a diagnostic instead of reset.

Known old card keys plus content/type signatures are needed to claim v1 cards; old description-as-type cards are recognized conservatively. Configuration Entry stays intact; new settings use defaults until added. Ambiguous cards stay untouched and may block replacement creation. Back up and resolve ownership before retrying. Optional titles alone are never enough to overwrite a card.

**Control change:** historical `/period` commands are deliberately not aliases; use `/lpt`. The old namespace remains untouched for other scripts. Historical names occur only in migration code, audit/history documentation and migration tests. No repository folder was renamed or moved.

## Troubleshooting

| Symptom | Try this |
| --- | --- |
| No cards | Check that Library and all three hooks are installed/enabled. Generate a normal turn; inspect logs for API or ownership errors. |
| No popup | Another script may own `state.message`, or the host may not display it. Read cards and script logs. |
| Config ignored | Resolve invalid/duplicate values. Use full-line comments and the Entry, not Notes. |
| Cycle seems frozen | Check active player pregnancy, turns/day, enabled script, matching action counters, and context/output lifecycle logs. |
| AI ignores symptoms | Check actual View Context, available budget and delivery mode. Cues guide the model; they don't compel it. |
| Duplicate/ambiguous cards | Back up first. Inspect sentinel keys/type and legacy signatures; do not delete foreign cards to make the error disappear. |
| Undo gives surprising status | The last eight narrative checkpoints are retained, and count decreases restore only those available. Deep Undo, different host timing and manual/card changes need a status check and explicit correction. |

Don't delete `state.lpt` as a first troubleshooting step. Manual recovery: back up, inspect the diagnostic, correct the conflicting card/config, then use day/week commands for intentional adjustments. Manual day/week commands don't emit milestone notices; natural transitions do. Existing external toasts are never overwritten.

## Small questions, honest answers

**Is this medical advice?** No. I wrote a roleplay script, not a medical device. Real bodies are more complicated than a settings table.

**Will the AI always remember my cramps?** I can hand it a concise note. I cannot make it stop being distracted by the mysterious duke.

**Will it hijack my other scripts?** It stays in its namespace and leaves their cards alone. Hook ordering and opaque maintenance calls still deserve a live test. Software has plot twists too.

## Tests, source and credits

For development, use Node.js 18+; no dependencies or `npm install` are needed:

```sh
npm run check
npm test
# Or run both:
npm run validate
```

Source: [Lilith6666666/lpt-lilith-period-tracker](https://github.com/Lilith6666666/lpt-lilith-period-tracker). Made by Lilith6666666 (Alex), under the original [MIT License](./LICENSE). AI Dungeon and the upstream authors retain credit for their platforms/projects; no upstream code is bundled.

May your continuity be better than your character's sleep schedule.
