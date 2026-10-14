// Lilith Period Tracker (LPT) v2.0.0 — Lilith6666666 (Alex), MIT.
// Shared AI Dungeon library. Initialization is lazy, per hook.
globalThis.LPT = (() => {
  "use strict";
  const VERSION = "2.0.0", TYPE = "Lilith Period Tracker", LIMIT = 16384, KEEP = 8, MAX_PEOPLE = 16;
  const KEYS = Object.freeze({config: "__LPT_CONFIG_V2__", status: "__LPT_STATUS_V2__", pregnancy: "__LPT_PREGNANCY_V2__"});
  const REG_OPEN = "# [EDITABLE CHARACTERS]", REG_CLOSE = "# [/EDITABLE CHARACTERS]";
  const AUTO_OPEN = "# [AUTO-GENERATED STATUS — DO NOT EDIT]", AUTO_CLOSE = "# [/AUTO-GENERATED STATUS]";
  const DEFAULTS = Object.freeze({blood_intensity: 3, cramps_strength: 3, mood_swings: 3, ovulation_heat: true,
    cycle_length: 28, bleed_days: 5, turns_per_day: 25, pregnancy_mode: false, narrative_intensity: "balanced",
    phase_notifications: true, pregnancy_notifications: true, context_delivery: "auto", pregnancy_length_turns: 400});
  const OPTIONS = Object.freeze({
    blood_intensity: [1, 5, "Typical menstrual bleeding; 1 = very light, 5 = very heavy."],
    cramps_strength: [1, 5, "Typical menstrual cramps; 1 = minimal, 5 = severe."],
    mood_swings: [1, 5, "Possible emotional sensitivity; 1 = low, 5 = high. Personality stays yours."],
    ovulation_heat: ["bool", "Ovulation attraction cues, only when appropriate; y/n."],
    cycle_length: [21, 35, "Cycle length in days; 21–35. Day 1 begins bleeding."],
    bleed_days: [2, 10, "Menstrual days at the start of the cycle; 2–10."],
    turns_per_day: [1, 200, "Successful narrative generations per cycle day; 1–200."],
    pregnancy_mode: ["bool", "Opt-in pregnancy tracking; y/n. n freezes pregnancies and preserves data."],
    narrative_intensity: [["subtle", "balanced", "immersive"], "Frequency of optional cues: subtle, balanced, immersive."],
    phase_notifications: ["bool", "Notify on natural cycle/phase transitions; y/n."],
    pregnancy_notifications: ["bool", "Notify on trimester and due milestones; y/n."],
    context_delivery: [["auto", "standard", "storycard"], "auto/standard use a short suffix; storycard requires a player-pinned status card."],
    pregnancy_length_turns: [40, 40000, "Turns from Week 1 to due; 40–40000. Duration is fixed when each pregnancy starts."]
  });
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const clone = o => JSON.parse(JSON.stringify(o));
  const integer = (n, min, max) => Number.isSafeInteger(n) && n >= min && n <= max;
  const count = () => typeof info !== "undefined" && integer(info.actionCount, 0, 1e9) ? info.actionCount : null;
  const cards = () => typeof storyCards !== "undefined" && Array.isArray(storyCards) ? storyCards : [];
  const display = v => typeof v === "boolean" ? (v ? "y" : "n") : String(v);
  function report(message) {
    const s = "LPT: " + String(message).slice(0, 2400);
    if (typeof state === "object" && !state.message) state.message = s;
    if (typeof log === "function") log(s);
  }
  function fail(message) { throw new Error(message); }
  function validate(key, raw) {
    if (!own(OPTIONS, key)) fail("Unknown setting: " + key);
    const rule = OPTIONS[key], v = String(raw).trim().toLowerCase();
    if (rule[0] === "bool") {
      if (["y", "yes", "true", "1", "on"].includes(v)) return true;
      if (["n", "no", "false", "0", "off"].includes(v)) return false;
      fail(key + " must be y or n.");
    }
    if (Array.isArray(rule[0])) {
      if (rule[0].includes(v)) return v;
      fail(key + " must be " + rule[0].join(" / ") + ".");
    }
    if (!/^\d+$/.test(v) || !integer(Number(v), rule[0], rule[1])) fail(key + " must be an integer " + rule[0] + "–" + rule[1] + ".");
    return Number(v);
  }
  function configText() {
    return ["# LILITH PERIOD TRACKER — CONFIGURATION", "# Edit values after =. # lines are help text; unknown lines are preserved.",
      ...Object.keys(DEFAULTS).flatMap(k => ["# " + OPTIONS[k][OPTIONS[k].length - 1], k + " = " + display(DEFAULTS[k])])].join("\n");
  }
  function parseConfig(entry, previous = DEFAULTS) {
    const cfg = {...DEFAULTS, ...previous}, errors = [], seen = [];
    if (typeof entry !== "string" || entry.length > LIMIT) return {cfg, errors: ["Configuration must be text, at most 16 KiB; retaining previous valid settings."]};
    for (const line of entry.split(/\r?\n/)) {
      if (!line.trim() || /^\s*#/.test(line)) continue;
      const m = line.match(/^\s*([a-z_]+)\s*[:=]\s*(.*?)\s*$/i);
      if (!m) { errors.push("Malformed configuration line: " + line.slice(0, 60)); continue; }
      const key = m[1].toLowerCase();
      if (!own(OPTIONS, key)) continue;
      if (seen.includes(key)) { errors.push("Duplicate setting: " + key); cfg[key] = previous[key] ?? DEFAULTS[key]; continue; }
      seen.push(key);
      try { cfg[key] = validate(key, m[2]); } catch (e) { errors.push(e.message); }
    }
    return {cfg, errors: errors.slice(0, 8)};
  }
  function patchLine(entry, key, value) {
    if (typeof entry !== "string" || entry.length > LIMIT) fail("Card too large or malformed; edit it before using commands.");
    const newline = entry.includes("\r\n") ? "\r\n" : "\n", lines = entry.split(/\r?\n/);
    let hits = 0;
    const result = lines.map(line => {
      const m = line.match(/^(\s*)([^#:=]+?)(\s*[:=]\s*)(.*?)(\s*)$/);
      if (!m || m[2].trim().toLowerCase() !== key.toLowerCase()) return line;
      hits++; return m[1] + m[2] + m[3] + value + m[5];
    });
    if (hits > 1) fail("Duplicate lines for " + key + "; resolve them before using this command.");
    if (!hits) result.push(key + " = " + value);
    const text = result.join(newline);
    if (text.length > LIMIT) fail("Card exceeds 16 KiB.");
    return text;
  }
  // API identity never relies on undocumented titles. Titles are optional UI sugar.
  function legacy(card, kind) {
    if (!card || !["config", "status"].includes(kind) || typeof card.entry !== "string") return false;
    const key = String(card.keys || "").toLowerCase();
    const knownType = kind === "config" ? String(card.type || "").startsWith("Player period configuration.\nRequired fields:") : card.type === "Read-only cycle snapshot generated by the script.";
    const signature = kind === "config" ? ["blood_intensity", "cramps_strength", "mood_swings", "ovulation_heat"].every(k => new RegExp("^\\s*" + k + "\\s*[:=]", "im").test(card.entry)) : /^Period Tracker Snapshot\nCycle day:/i.test(card.entry);
    return key === "period tracker " + kind && signature && (knownType || card.type === "Period Tracker");
  }
  function locate(kind) {
    const list = cards(), key = KEYS[kind];
    const hits = list.map((c, i) => c && c.keys === key ? i : -1).filter(i => i >= 0);
    if (hits.length > 1 || (hits.length === 1 && list[hits[0]].type !== TYPE)) fail("Conflicting " + kind + " sentinel; no card was changed. Resolve duplicate/foreign keys.");
    return hits.length ? hits[0] : -1;
  }
  function writeCard(kind, entry) {
    if (typeof entry !== "string" || entry.length > LIMIT) fail("Card payload exceeds 16 KiB; original Entry retained.");
    const i = locate(kind);
    if (i < 0 || typeof updateStoryCard !== "function") fail("Story Card update API unavailable for " + kind + ".");
    if (cards()[i].entry === entry) return;
    if (updateStoryCard(i, KEYS[kind], entry, TYPE) === false) fail("Story Card update rejected for " + kind + ".");
  }
  function ensureCard(kind, entry) {
    let i = locate(kind);
    if (i >= 0) return cards()[i];
    const list = cards(), old = list.map((c, j) => legacy(c, kind) ? j : -1).filter(j => j >= 0);
    if (old.length > 1) fail("Multiple possible legacy " + kind + " cards; nothing claimed.");
    if (old.length === 1) {
      if (typeof updateStoryCard !== "function") return null;
      i = old[0];
      if (updateStoryCard(i, KEYS[kind], list[i].entry, TYPE) === false) return null;
    } else {
      const suspicious = list.some(c => c && (String(c.keys || "").toLowerCase() === "period tracker " + kind || c.title === "Period Tracker " + (kind === "config" ? "Config" : "Status")));
      if (suspicious) fail("Ambiguous legacy " + kind + " card retained; new card withheld. Back up and resolve ownership.");
      if (typeof addStoryCard !== "function") return null;
      if (addStoryCard(KEYS[kind], entry, TYPE) === false) { report("Could not create " + kind + " card; no foreign card modified."); return null; }
    }
    i = locate(kind);
    if (i < 0) return null;
    const c = cards()[i];
    if (own(c, "title") && typeof c.title === "string") {
      try { c.title = TYPE + " — " + ({config: "Configuration", status: "Cycle Status", pregnancy: "Pregnancy"})[kind]; } catch (_) { /* optional metadata */ }
    }
    return c;
  }
  function peopleCopy(people) {
    return people.map(p => ({key: p.key, name: p.name, registration: p.registration, registered: p.registered,
      active: p.active, progress: p.progress, duration: p.duration}));
  }
  function snapshot(rt) { return {cycle_day: rt.cycle_day, turn_in_day: rt.turn_in_day, turns_per_day: rt.turns_per_day, people: peopleCopy(rt.people)}; }
  function restore(rt, s) { Object.assign(rt, snapshot(s)); }
  function validSnapshot(s) {
    if (!s || !integer(s.cycle_day, 1, 35) || !integer(s.turn_in_day, 0, 199) ||
        !integer(s.turns_per_day, 1, 200) || s.turn_in_day >= s.turns_per_day || !Array.isArray(s.people) || s.people.length > MAX_PEOPLE) return false;
    const ids = [];
    for (const p of s.people) {
      if (!p || typeof p.name !== "string" || p.name.length > 64 || typeof p.key !== "string" || p.key.length > 132) return false;
      let id;
      try { id = identity(p.key === "@player" ? "player" : JSON.stringify(p.name)); } catch (_) { return false; }
      if (id.key !== p.key || ids.includes(p.key) || !["capable", "pregnant"].includes(p.registration) || typeof p.active !== "boolean" ||
          typeof p.registered !== "boolean" || p.active !== (p.registration === "pregnant") ||
          !integer(p.duration, 40, 40000) || !integer(p.progress, 0, p.duration)) return false;
      ids.push(p.key);
    }
    return true;
  }
  function runtime(cfg) {
    if (state.lpt == null) {
      const old = state.periodTracker;
      if (old != null && (typeof old !== "object" || !integer(old.cycle_day, 1, 35) || !integer(old.turn_counter, 0, 1e9))) fail("Legacy state is malformed; retained without migration. Back it up before repair.");
      state.lpt = {schema: 2, version: VERSION, migrated_from: old ? "1.0.0" : null,
        cycle_day: old ? Math.min(old.cycle_day, cfg.cycle_length) : 1,
        turn_in_day: old ? old.turn_counter % cfg.turns_per_day : 0, turns_per_day: cfg.turns_per_day,
        people: [], journal: [], receipts: [], pending: null, control: null, excluded: null, last_story_count: null, config: {...cfg}};
    }
    const rt = state.lpt;
    if (typeof rt !== "object" || rt.schema !== 2 || !integer(rt.cycle_day, 1, 35) || !integer(rt.turn_in_day, 0, 199) ||
        !integer(rt.turns_per_day, 1, 200) || !Array.isArray(rt.people) || rt.people.length > MAX_PEOPLE ||
        !Array.isArray(rt.journal) || rt.journal.length > KEEP || !Array.isArray(rt.receipts) || rt.receipts.length > KEEP) fail("Unsupported or malformed state.lpt; preserved. Restore a backup before repair.");
    if (!validSnapshot(rt) || rt.journal.some(j => !j || j.kind !== "story" || !integer(j.count, 0, 1e9) || !validSnapshot(j.before)) ||
        rt.receipts.some(r => !r || (r.count !== null && !integer(r.count, 0, 1e9)) || typeof r.command !== "string" || r.command.length > 512 || typeof r.message !== "string" || r.message.length > 2400) ||
        (rt.pending != null && (!integer(rt.pending.count, 0, 1e9) || typeof rt.pending.signature !== "string" || rt.pending.signature.length > 2000 || !validSnapshot(rt.pending.before) || !validSnapshot(rt.pending.next)))) fail("Malformed LPT checkpoint or pregnancy state; retained without changes.");
    if (rt.last_story_count != null && !integer(rt.last_story_count, 0, 1e9)) fail("Malformed LPT action counter; retained without changes.");
    return rt;
  }
  function normalizeCycle(rt, cfg) {
    rt.cycle_day = Math.min(rt.cycle_day, cfg.cycle_length);
    if (rt.turns_per_day !== cfg.turns_per_day) rt.turn_in_day = Math.min(cfg.turns_per_day - 1, Math.floor(rt.turn_in_day * cfg.turns_per_day / rt.turns_per_day));
    rt.turns_per_day = cfg.turns_per_day;
  }
  function rollback(rt) {
    const c = count();
    if (c === null || !rt.journal.length || c >= rt.journal[rt.journal.length - 1].count) return;
    const reversed = rt.journal.filter(j => j.count > c);
    if (reversed.length) {
      restore(rt, reversed[0].before); rt.journal = rt.journal.filter(j => j.count <= c);
      rt.last_story_count = rt.journal.length ? rt.journal[rt.journal.length - 1].count : null;
      rt.receipts = rt.receipts.filter(r => r.count <= c); rt.pending = null; rt.control = null; rt.excluded = null;
      report("Restored a retained checkpoint after action count decreased; verify status after Undo.");
    }
  }
  function boundaries(cfg) {
    // At least one follicular and one luteal day at every supported extreme.
    const start = Math.max(cfg.bleed_days + 2, cfg.cycle_length - 16);
    const end = Math.min(cfg.cycle_length - 1, Math.max(start, cfg.cycle_length - 12));
    return {menstrual: [1, cfg.bleed_days], follicular: [cfg.bleed_days + 1, start - 1], ovulatory: [start, end], luteal: [end + 1, cfg.cycle_length]};
  }
  function phase(day, cfg) {
    const ranges = boundaries(cfg), id = Object.keys(ranges).find(k => day >= ranges[k][0] && day <= ranges[k][1]);
    return {id, name: id[0].toUpperCase() + id.slice(1), range: ranges[id]};
  }
  const BLOOD = ["very light", "light", "moderate", "heavy", "very heavy"], CRAMPS = ["minimal", "mild", "moderate", "strong", "severe"];
  function profile(day, cfg) {
    const p = phase(day, cfg), mood = cfg.mood_swings <= 2 ? "slight" : cfg.mood_swings === 3 ? "moderate" : "pronounced";
    if (p.id === "menstrual") return `${day <= 2 ? "Early" : "Later"} menstrual days may bring ${BLOOD[cfg.blood_intensity - 1]} bleeding and ${CRAMPS[cfg.cramps_strength - 1]} cramps. ${day <= 2 ? "Energy may be lower" : "Discomfort may ease as these days pass"}; emotional sensitivity may be ${mood}.`;
    if (p.id === "follicular") return `Energy and concentration may gradually recover. Bodily discomfort may be quieter; emotional sensitivity may be ${mood}, with individual variation.`;
    if (p.id === "ovulatory") return `There may be a brief mid-cycle ache or a lift in energy. ${cfg.ovulation_heat ? "Attraction may feel a little stronger in an appropriate scene; no sexual behavior is implied." : "Keep attraction cues at the character's usual baseline."} Emotional sensitivity may be ${mood}.`;
    return `${day >= cfg.cycle_length - 5 ? "Late" : "Early"} luteal days may bring ${day >= cfg.cycle_length - 5 ? "bloating, tenderness or tiredness" : "subtle changes in energy or comfort"}. Emotional sensitivity may be ${mood}; keep reactions individual and voluntary.`;
  }
  function identity(raw) {
    let name = String(raw).trim(), quoted = false;
    if (name.startsWith('"')) { try { name = JSON.parse(name); quoted = true; } catch (_) { fail("Use a complete quoted name, e.g. \"Player\"."); } }
    if (typeof name !== "string" || !name.trim() || name.length > 64 || /[\x00-\x1f\x7f\[\]{}=,#<>\\/]/.test(name) || /[\u202a-\u202e\u2066-\u2069]/.test(name)) fail("Character names must be 1–64 characters without controls, brackets, commas, = or markup.");
    name = name.trim(); const lower = name.toLowerCase();
    if (["__proto__", "prototype", "constructor"].includes(lower)) fail("Reserved unsafe character name.");
    return {key: !quoted && lower === "player" ? "@player" : "npc:" + lower, name: !quoted && lower === "player" ? "player" : name};
  }
  const label = p => p.key === "@player" ? "player" : JSON.stringify(p.name);
  function pregnancyText() {
    return ["# LILITH PERIOD TRACKER — PREGNANCY", "# One name = capable or pregnant per line. capable never starts a pregnancy.",
      "# player is the protagonist; use \"Player\" for an NPC with that name.", "# Changes apply while mode is on. Removing a line freezes that character; saved data stays.",
      REG_OPEN, "player = capable", REG_CLOSE, AUTO_OPEN, "No active pregnancies.", AUTO_CLOSE].join("\n");
  }
  function region(entry, open, close) {
    if (typeof entry !== "string" || entry.length > LIMIT) fail("Pregnancy card must be text at most 16 KiB.");
    const lines = entry.split(/\r?\n/), a = lines.indexOf(open), b = lines.indexOf(close);
    if (a < 0 || b <= a || lines.lastIndexOf(open) !== a || lines.lastIndexOf(close) !== b) fail("Restore pregnancy card delimiters; no registration changed.");
    return {lines, a, b, newline: entry.includes("\r\n") ? "\r\n" : "\n"};
  }
  function registry(entry) {
    const r = region(entry, REG_OPEN, REG_CLOSE), list = [];
    for (const line of r.lines.slice(r.a + 1, r.b)) {
      if (!line.trim() || /^\s*#/.test(line)) continue;
      const m = line.match(/^\s*(.*?)\s*=\s*(capable|pregnant)\s*$/i);
      if (!m) fail("Invalid registration: " + line.slice(0, 60));
      const id = identity(m[1]);
      if (list.some(p => p.key === id.key)) fail("Duplicate character: " + id.name);
      list.push({...id, registration: m[2].toLowerCase()});
      if (list.length > MAX_PEOPLE) fail("At most 16 registered characters.");
    }
    return list;
  }
  function reconcile(rt, cfg, entry) {
    const list = registry(entry), next = peopleCopy(rt.people);
    if (new Set([...next.map(p => p.key), ...list.map(p => p.key)]).size > MAX_PEOPLE) fail("At most 16 saved characters, including removed registrations. Reuse a character or back up before pruning state.");
    for (const p of next) p.registered = list.some(x => x.key === p.key);
    for (const item of list) {
      let p = next.find(x => x.key === item.key);
      if (!p) { p = {...item, registered: true, active: false, progress: 0, duration: cfg.pregnancy_length_turns}; next.push(p); }
      p.name = item.name; p.registered = true;
      if (item.registration !== p.registration || (item.registration === "pregnant" && !p.active)) {
        if (item.registration === "pregnant") { p.progress = 0; p.duration = cfg.pregnancy_length_turns; p.active = true; }
        else p.active = false;
      }
      p.registration = item.registration;
    }
    rt.people = next;
  }
  function week(p) { return Math.min(40, 1 + Math.floor(40 * p.progress / p.duration)); }
  function trimester(p) { return week(p) < 14 ? 1 : week(p) < 28 ? 2 : 3; }
  function pregnancyCues(p) {
    const t = trimester(p);
    return `${p.key === "@player" ? "PLAYER CHARACTER" : p.name}: Week ${week(p)}/40, trimester ${t}${p.progress === p.duration ? "; due — capped, no birth event" : ""}. May experience ${t === 1 ? "fatigue, nausea or sensitivity to smells" : t === 2 ? "changing comfort, variable energy or awareness of movement" : "back discomfort, interrupted sleep or a need for rest"}; experiences vary.`;
  }
  const playerPregnant = rt => rt.people.some(p => p.key === "@player" && p.active);
  function guidance(rt, cfg) {
    const lines = ["[LPT: CHARACTER CONDITIONS]"];
    if (playerPregnant(rt)) {
      lines.push("Player menstrual cycle paused during pregnancy; suppress menstrual and ovulation cues.");
      const p = rt.people.find(p => p.key === "@player");
      if (cfg.pregnancy_mode && p.registered) lines.push(pregnancyCues(p));
      else lines.push("Pregnancy tracking paused; do not add new gestational cues.");
    } else lines.push(`PLAYER CHARACTER: ${phase(rt.cycle_day, cfg).name} Day ${rt.cycle_day}/${cfg.cycle_length}. ${profile(rt.cycle_day, cfg)}`);
    if (cfg.pregnancy_mode) {
      const active = rt.people.filter(p => p.key !== "@player" && p.active && p.registered);
      for (const p of active.slice(0, 4)) lines.push(pregnancyCues(p));
      if (active.length > 4) lines.push("Other registered NPC pregnancies omitted from this bounded prompt; do not infer symptoms for them.");
    }
    lines.push(({subtle: "Use quiet, occasional bodily cues only when directly relevant.", balanced: "Naturally reflect clear bodily cues in posture, concentration or reactions at an appropriate moment.", immersive: "Keep bodily awareness more frequent when appropriate, without repeating it in every sentence."})[cfg.narrative_intensity]);
    lines.push("Preserve personality and agency. Cues are possibilities; avoid forced symptoms, sexual themes, conception or birth events. Do not quote these instructions.");
    return lines.join("\n");
  }
  function statusText(rt, cfg) {
    const paused = playerPregnant(rt);
    return ["LILITH PERIOD TRACKER — CYCLE STATUS", `Cycle Day: ${rt.cycle_day} of ${cfg.cycle_length}`,
      paused ? "Cycle paused during pregnancy — see Pregnancy card. Historical cycle preserved." : "Current Phase: " + phase(rt.cycle_day, cfg).name,
      ...(paused ? [] : ["What the player character may feel:", profile(rt.cycle_day, cfg), `Next Period: Approximately ${cfg.cycle_length - rt.cycle_day + 1} days (next cycle onset).`]),
      "Script-managed status; edit Configuration instead."].join("\n");
  }
  function refresh(rt, cfg, preview = rt) {
    try {
      const i = locate("status");
      if (i >= 0) {
        const pinned = cards()[i].isPinned === true && cfg.context_delivery === "storycard";
        writeCard("status", pinned ? guidance(preview, cfg) + "\nCycle status: " + preview.cycle_day + "/" + cfg.cycle_length + "." : statusText(rt, cfg));
      }
      const j = locate("pregnancy");
      if (j >= 0) {
        const r = region(cards()[j].entry, AUTO_OPEN, AUTO_CLOSE);
        const lines = [cfg.pregnancy_mode ? "Tracking enabled." : "Tracking paused; all data preserved.", ...rt.people.map(p =>
          `${label(p)} — ${!p.registered ? "registration removed; frozen; " : ""}${p.active ? "Week " + week(p) + "/40; Trimester " + trimester(p) + "; " + p.progress + "/" + p.duration + " turns" + (p.progress === p.duration ? "; Due (no automatic event)" : "") : "capable; not pregnant"}`)];
        r.lines.splice(r.a + 1, r.b - r.a - 1, ...lines);
        writeCard("pregnancy", r.lines.join(r.newline));
      }
    } catch (e) { report(e.message); }
  }
  function initialize() {
    const configCard = ensureCard("config", configText());
    const previous = state.lpt && state.lpt.schema === 2 ? state.lpt.config : DEFAULTS, safe = {...DEFAULTS};
    if (previous && typeof previous === "object") for (const k of Object.keys(DEFAULTS)) {
      try { if (own(previous, k)) safe[k] = validate(k, display(previous[k])); } catch (_) { /* default */ }
    }
    const parsed = parseConfig(configCard ? configCard.entry : "", safe), cfg = parsed.cfg, rt = runtime(cfg);
    // A user correction establishes a new baseline; never Undo an older snapshot over it.
    if (JSON.stringify(safe) !== JSON.stringify(cfg)) { rt.journal = []; rt.pending = null; }
    rollback(rt); normalizeCycle(rt, cfg); rt.config = {...cfg};
    if (parsed.errors.length) report(parsed.errors.join(" "));
    ensureCard("status", statusText(rt, cfg));
    if (cfg.pregnancy_mode) {
      const p = ensureCard("pregnancy", pregnancyText());
      if (p) {
        const before = JSON.stringify(peopleCopy(rt.people));
        try { reconcile(rt, cfg, p.entry); } catch (e) { report(e.message); }
        if (before !== JSON.stringify(peopleCopy(rt.people))) { rt.journal = []; rt.pending = null; }
      }
    }
    return {rt, cfg};
  }
  function advance(base, cfg) {
    const next = clone(base);
    if (!playerPregnant(base)) {
      next.turn_in_day++;
      if (next.turn_in_day >= cfg.turns_per_day) { next.turn_in_day = 0; next.cycle_day = next.cycle_day % cfg.cycle_length + 1; }
    }
    if (cfg.pregnancy_mode) for (const p of next.people) if (p.active && p.registered) p.progress = Math.min(p.duration, p.progress + 1);
    return next;
  }
  function excluded(rt) {
    const c = count();
    return c === null || (rt.control && rt.control.count === c) || rt.excluded === c;
  }
  function prepare(rt, cfg) {
    const c = count();
    if (excluded(rt)) return null;
    if (rt.pending && rt.pending.count === c && rt.pending.signature === JSON.stringify(cfg) &&
        JSON.stringify(rt.pending.before) === JSON.stringify(snapshot(rt))) return rt.pending;
    if (rt.last_story_count === c || rt.journal.some(j => j.count === c && j.kind === "story")) return null;
    rt.pending = {count: c, signature: JSON.stringify(cfg), before: snapshot(rt), next: advance(snapshot(rt), cfg)};
    return rt.pending;
  }
  function commit(rt, cfg, pending) {
    const before = pending.before, next = pending.next;
    restore(rt, next); rt.journal.push({count: pending.count, kind: "story", before}); rt.journal = rt.journal.slice(-KEEP);
    rt.pending = null; rt.last_story_count = pending.count;
    const events = [];
    if (cfg.phase_notifications && next.cycle_day !== before.cycle_day) {
      if (next.cycle_day === 1) events.push("New menstrual cycle: Day 1.");
      else if (phase(next.cycle_day, cfg).id !== phase(before.cycle_day, cfg).id) events.push("Entered " + phase(next.cycle_day, cfg).name + " phase.");
    }
    if (cfg.pregnancy_notifications) for (const p of next.people) {
      const old = before.people.find(x => x.key === p.key);
      if (!old || !p.active) continue;
      if (old.progress < p.duration && p.progress === p.duration) events.push(p.name + " is due; tracking capped, no story event.");
      else if (trimester(old) !== trimester(p)) events.push(p.name + " entered trimester " + trimester(p) + ".");
    }
    if (events.length) report(events.slice(0, 3).join(" "));
  }
  function delivery(rt, cfg) {
    const i = locate("status"), pinned = i >= 0 && cards()[i].isPinned === true;
    // Never set pins automatically. Pin state is not proof of actual model inclusion.
    if (cfg.context_delivery === "storycard" && pinned) return {route: "storycard", note: "Player-pinned status card prepared; verify inclusion and preview in View Context. No direct injection."};
    const optimized = typeof info !== "undefined" && info.useCacheEfficient === true;
    return {route: "standard", note: (cfg.context_delivery === "storycard" ? "Status card not pinned/available; direct fallback. " : "") +
      (optimized ? "Cache-compatible suffix prepared; inspect actual Optimized Context." : "Direct context suffix prepared; actual model receipt unverified.")};
  }
  const HELP = ["Lilith Period Tracker v2 commands (use Story input for plain commands):", "/lpt help | status | debugContext", "/lpt set blood 3 | cramps 4 | mood 5 | heat y | day 12",
    "/lpt set <configuration_key> <value> (all settings supported)", "/lpt nextday [1–365]", "/lpt pregnancyStart = Alex", "/lpt pregnancyEnd = Alex",
    "/lpt pregnancyStatus = Alex", "/lpt pregnancyStatus = Alex,12", "/lpt pregnancyStatus = 12 (registered player)", "Enable pregnancy_mode first. Week must be 1–40. No conception/birth inference."].join("\n");
  function commandString(text) {
    const s = String(text).trim(), unwrapped = s.startsWith("> You ") ? s.slice(6).trim() : s;
    // Official parser example documents Do's prefix; Say is deliberately excluded.
    return /^\/lpt(?=\s|$)/i.test(unwrapped) ? unwrapped : null;
  }
  function changeRegistration(rt, cfg, id, registration, newWeek) {
    const i = locate("pregnancy");
    if (i < 0) fail("Pregnancy card/API unavailable; no pregnancy changed.");
    const entry = cards()[i].entry, r = region(entry, REG_OPEN, REG_CLOSE);
    registry(entry); // Reject malformed/duplicate registers before any mutation.
    const next = peopleCopy(rt.people); let p = next.find(x => x.key === id.key);
    if (!p) {
      if (next.length >= MAX_PEOPLE) fail("At most 16 saved characters.");
      p = {...id, registration: "capable", active: false, registered: true, progress: 0, duration: cfg.pregnancy_length_turns}; next.push(p);
    }
    if (registration === "pregnant" && !p.active) { p.active = true; p.progress = 0; p.duration = cfg.pregnancy_length_turns; }
    if (registration === "capable") p.active = false;
    p.registration = registration; p.registered = true;
    if (newWeek !== undefined) {
      if (!p.active) fail("Character is not pregnant; start tracking first.");
      p.progress = Math.ceil((newWeek - 1) * p.duration / 40);
    }
    let found = false;
    const edit = r.lines.slice(r.a + 1, r.b).map(line => {
      const m = line.match(/^\s*(.*?)\s*=\s*(capable|pregnant)\s*$/i);
      if (m && identity(m[1]).key === id.key) { found = true; return patchLine(line, m[1].trim(), registration); }
      return line;
    });
    if (!found) edit.push(label(p) + " = " + registration);
    r.lines.splice(r.a + 1, r.b - r.a - 1, ...edit);
    const updated = r.lines.join(r.newline);
    if (updated.length > LIMIT) fail("Pregnancy card exceeds 16 KiB.");
    writeCard("pregnancy", updated); rt.people = next; return p;
  }
  function execute(command, rt, cfg) {
    const body = command.replace(/^\/lpt\s*/i, "");
    if (!body || /^help$/i.test(body)) return HELP;
    if (/^status$/i.test(body)) return statusText(rt, cfg);
    if (/^debugContext$/i.test(body)) {
      const d = delivery(rt, cfg);
      return "Prepared LPT guidance (not proof of model delivery). Route: " + d.route + ". " + d.note + "\n" + guidance(rt, cfg);
    }
    const set = body.match(/^set\s+(\w+)\s+(\S+)$/i), day = body.match(/^nextday(?:\s+(\S+))?$/i);
    if (set) {
      const aliases = {blood: "blood_intensity", cramps: "cramps_strength", mood: "mood_swings", heat: "ovulation_heat"};
      const name = set[1].toLowerCase(), k = own(aliases, name) ? aliases[name] : name;
      if (k === "day") {
        if (playerPregnant(rt)) fail("Cycle paused during player pregnancy; end tracking before changing the cycle.");
        if (!/^\d+$/.test(set[2]) || !integer(Number(set[2]), 1, cfg.cycle_length)) fail("Day must be 1–" + cfg.cycle_length + ".");
        rt.cycle_day = Number(set[2]); return "Cycle Day set to " + rt.cycle_day + "; partial-day progress retained.";
      }
      const value = validate(k, set[2]), i = locate("config");
      if (i < 0) fail("Configuration card/API unavailable; setting unchanged.");
      writeCard("config", patchLine(cards()[i].entry, k, display(value)));
      return "Updated " + k + " = " + display(value) + ".";
    }
    if (day) {
      if (playerPregnant(rt)) fail("Cycle paused during player pregnancy.");
      const raw = day[1] || "1";
      if (!/^\d+$/.test(raw) || !integer(Number(raw), 1, 365)) fail("nextday must be an integer 1–365.");
      rt.cycle_day = (rt.cycle_day - 1 + Number(raw)) % cfg.cycle_length + 1;
      return "Cycle Day: " + rt.cycle_day + "; partial-day progress retained.";
    }
    const pregnancy = body.match(/^(pregnancyStart|pregnancyEnd|pregnancyStatus)\s*=\s*(.+)$/i);
    if (pregnancy) {
      if (!cfg.pregnancy_mode) fail("Pregnancy mode is off. Set pregnancy_mode = y in Configuration first.");
      const verb = pregnancy[1].toLowerCase(), args = pregnancy[2].trim(); let name = args, w;
      if (verb === "pregnancystatus") {
        const m = args.match(/^(.*?),\s*(\d+)$/);
        if (m) { name = m[1].trim(); w = Number(m[2]); }
        else if (/^\d+$/.test(args)) { name = "player"; w = Number(args); }
      }
      const id = identity(name), p = rt.people.find(x => x.key === id.key && x.registered);
      if (w !== undefined && !integer(w, 1, 40)) fail("Week must be an integer 1–40.");
      if ((verb === "pregnancystatus" || verb === "pregnancyend") && (!p || !p.active)) fail("No active registered pregnancy for " + id.name + ".");
      if (verb === "pregnancystatus" && w === undefined) return pregnancyCues(p);
      const updated = changeRegistration(rt, cfg, id, verb === "pregnancyend" ? "capable" : "pregnant", w);
      return verb === "pregnancyend" ? "Ended tracking for " + id.name + "; no narrative event implied. Player cycle resumes its saved day/progress." : pregnancyCues(updated);
    }
    fail("Unknown or malformed command. Use /lpt help.");
  }
  function inputHook(text) {
    const {rt, cfg} = initialize(), command = commandString(text), c = count(); rt.pending = null;
    if (!command) {
      rt.control = null; rt.excluded = /^(?:\s*> You )?\s*\/[a-z]/i.test(String(text)) ? c : null;
      refresh(rt, cfg); return {text};
    }
    if (command.length > 512) { rt.control = {count: c}; report("Command too long; limit 512 characters."); return {text, stop: true}; }
    const receipt = rt.receipts.find(r => r.count === c && r.command === command);
    if (receipt) { rt.control = {count: c}; report(receipt.message); return {text, stop: true}; }
    let message; const before = snapshot(rt);
    try {
      const readOnly = /^\/lpt\s*(?:help|status|debugContext)?\s*$/i.test(command) || /^\/lpt\s+pregnancyStatus\s*=\s*[^,\d]+$/i.test(command);
      if (c === null && !readOnly) fail("Action counter unavailable; use card edits until the host exposes info.actionCount.");
      message = execute(command, rt, cfg);
      // Explicit corrections establish a new baseline. Card edits aren't host-Undo transactions.
      if (JSON.stringify(before) !== JSON.stringify(snapshot(rt))) rt.journal = [];
    } catch (e) { message = e.message; }
    rt.control = {count: c}; rt.excluded = null;
    rt.receipts.push({count: c, command, message: message.slice(0, 2400)}); rt.receipts = rt.receipts.slice(-KEEP);
    report(message); const current = initialize(); refresh(current.rt, current.cfg);
    return {text, stop: true};
  }
  function contextHook(text) {
    const {rt, cfg} = initialize();
    if (excluded(rt)) { refresh(rt, cfg); return {text}; }
    const p = prepare(rt, cfg), effective = p ? p.next : rt, d = delivery(rt, cfg); refresh(rt, cfg, effective);
    if (d.route === "storycard") return {text};
    const block = guidance(effective, cfg), addition = "\n\n" + block;
    if (typeof text !== "string" || text.includes("[LPT: CHARACTER CONDITIONS]")) return {text};
    const max = typeof info !== "undefined" && integer(info.maxChars, 1, 1e7) ? info.maxChars : null;
    if (max !== null && text.length + addition.length > max) { report("No context budget for prepared LPT guidance; upstream text preserved."); return {text}; }
    return {text: text + addition};
  }
  function outputHook(text) {
    const {rt, cfg} = initialize(), c = count(), p = rt.pending;
    // Without a matching Context preview there is no proof of an eligible generation.
    if (!p || excluded(rt) || typeof text !== "string" || !text.trim() ||
        (typeof info !== "undefined" && info.emptyOutputReason) || c !== p.count || p.signature !== JSON.stringify(cfg) ||
        JSON.stringify(p.before) !== JSON.stringify(snapshot(rt)) || rt.journal.some(j => j.count === p.count && j.kind === "story")) {
      refresh(rt, cfg); return {text};
    }
    commit(rt, cfg, p); refresh(rt, cfg); return {text};
  }
  function hook(stage, text, upstreamStop) {
    const result = {text}; if (upstreamStop !== undefined) result.stop = upstreamStop;
    if (upstreamStop === true) { if (state.lpt && state.lpt.schema === 2) state.lpt.pending = null; return result; }
    try { return {...result, ...({input: inputHook, context: contextHook, output: outputHook})[stage](text)}; }
    catch (e) {
      report(e.message);
      if (stage === "input" && commandString(text)) result.stop = true;
      return result;
    }
  }
  return Object.freeze({VERSION, TYPE, KEYS, DEFAULTS, OPTIONS, hook,
    parseConfig, validate, boundaries, phase, profile, guidance, advance, week, trimester, identity, registry, patchLine});
})();
