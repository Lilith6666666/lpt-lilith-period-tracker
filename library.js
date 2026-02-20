// Period Tracker - Library script
// Standalone AI Dungeon script set for cycle phase tracking.

if (!globalThis.PeriodTracker) {
  globalThis.PeriodTracker = (() => {
    const VERSION = "1.0.0";
    const CONFIG_TITLE = "Period Tracker Config";
    const STATUS_TITLE = "Period Tracker Status";

    const DEFAULT_CONFIG = Object.freeze({
      blood_intensity: 3,
      cramps_strength: 3,
      mood_swings: 3,
      ovulation_heat: true,
      cycle_length: 28,
      bleed_days: 5,
      turns_per_day: 25,
    });

    const BLOOD_LABELS = ["very light", "light", "moderate", "heavy", "very heavy"];
    const CRAMP_LABELS = ["minimal", "mild", "moderate", "strong", "severe"];
    const MOOD_LABELS = ["stable", "slightly sensitive", "moderately sensitive", "highly sensitive", "very reactive"];

    function clampInt(value, min, max, fallback) {
      const n = Number.parseInt(value, 10);
      if (!Number.isFinite(n)) return fallback;
      if (n < min) return min;
      if (max < n) return max;
      return n;
    }

    function toBool(value, fallback) {
      const v = String(value ?? "").trim().toLowerCase();
      if (["y", "yes", "true", "1", "on"].includes(v)) return true;
      if (["n", "no", "false", "0", "off"].includes(v)) return false;
      return fallback;
    }

    function findCard(title) {
      if (!Array.isArray(globalThis.storyCards)) return null;
      return storyCards.find(sc => sc.title === title) || null;
    }

    function ensureCard(title, entry, description) {
      let card = findCard(title);
      if (!card && (typeof addStoryCard === "function")) {
        addStoryCard(title, entry, description);
        card = findCard(title);
      }
      return card;
    }

    function formatConfig(cfg) {
      return [
        `blood_intensity = ${cfg.blood_intensity}`,
        `cramps_strength = ${cfg.cramps_strength}`,
        `mood_swings = ${cfg.mood_swings}`,
        `ovulation_heat = ${cfg.ovulation_heat ? "y" : "n"}`,
        `cycle_length = ${cfg.cycle_length}`,
        `bleed_days = ${cfg.bleed_days}`,
        `turns_per_day = ${cfg.turns_per_day}`,
      ].join("\n");
    }

    function parseConfig(entry) {
      const cfg = { ...DEFAULT_CONFIG };
      const lines = String(entry || "").split(/\r?\n/);

      for (const line of lines) {
        const m = line.match(/^\s*([a-z_]+)\s*[:=]\s*(.+?)\s*$/i);
        if (!m) continue;
        const key = m[1].toLowerCase();
        const value = m[2];

        if (key === "blood_intensity") cfg.blood_intensity = clampInt(value, 1, 5, cfg.blood_intensity);
        if (key === "cramps_strength") cfg.cramps_strength = clampInt(value, 1, 5, cfg.cramps_strength);
        if (key === "mood_swings") cfg.mood_swings = clampInt(value, 1, 5, cfg.mood_swings);
        if (key === "ovulation_heat") cfg.ovulation_heat = toBool(value, cfg.ovulation_heat);
        if (key === "cycle_length") cfg.cycle_length = clampInt(value, 21, 35, cfg.cycle_length);
        if (key === "bleed_days") cfg.bleed_days = clampInt(value, 2, 10, cfg.bleed_days);
        if (key === "turns_per_day") cfg.turns_per_day = clampInt(value, 1, 200, cfg.turns_per_day);
      }

      // Keep phase windows coherent.
      cfg.bleed_days = clampInt(cfg.bleed_days, 2, Math.max(2, cfg.cycle_length - 10), cfg.bleed_days);
      return cfg;
    }

    function getConfig() {
      const card = ensureConfigCard();
      const cfg = parseConfig(card ? card.entry : "");
      if (card && card.entry !== formatConfig(cfg)) {
        card.entry = formatConfig(cfg);
      }
      return cfg;
    }

    function setConfigPatch(patch) {
      const cfg = getConfig();
      const merged = { ...cfg, ...patch };
      const normalized = parseConfig(formatConfig(merged));
      const card = ensureConfigCard();
      if (card) card.entry = formatConfig(normalized);
      return normalized;
    }

    function ensureRuntime(cfg) {
      state.periodTracker ??= {
        version: VERSION,
        cycle_day: 1,
        turn_counter: 0,
        last_phase_id: "",
        skip_advance_once: false,
        command_center: "",
      };

      const rt = state.periodTracker;
      rt.version = VERSION;
      rt.cycle_day = clampInt(rt.cycle_day, 1, cfg.cycle_length, 1);
      rt.turn_counter = clampInt(rt.turn_counter, 0, 99999999, 0);
      rt.skip_advance_once = rt.skip_advance_once === true;
      rt.command_center = String(rt.command_center || "");
      return rt;
    }

    function ensureConfigCard() {
      const description = [
        "Player period configuration.",
        "Required fields:",
        "- blood_intensity: 1-5",
        "- cramps_strength: 1-5",
        "- mood_swings: 1-5",
        "- ovulation_heat: y/n",
        "Optional fields:",
        "- cycle_length: 21-35 (default 28)",
        "- bleed_days: 2-10 (default 5)",
        "- turns_per_day: story turns per cycle day (default 25)",
      ].join("\n");

      const card = ensureCard(CONFIG_TITLE, formatConfig(DEFAULT_CONFIG), description);
      if (card) {
        card.keys = "period tracker config";
        card.description = description;
      }
      return card;
    }

    function ensureStatusCard() {
      const card = ensureCard(
        STATUS_TITLE,
        "Period tracker status will update automatically.",
        "Read-only cycle snapshot generated by the script."
      );
      if (card) {
        card.keys = "period tracker status";
      }
      return card;
    }

    function phaseBoundaries(cfg) {
      const menstrualStart = 1;
      const menstrualEnd = cfg.bleed_days;

      const ovulationStart = clampInt(cfg.cycle_length - 16, menstrualEnd + 1, cfg.cycle_length - 1, menstrualEnd + 1);
      const ovulationEnd = clampInt(cfg.cycle_length - 12, ovulationStart, cfg.cycle_length - 1, ovulationStart);

      const follicularStart = menstrualEnd + 1;
      const follicularEnd = ovulationStart - 1;

      const lutealStart = ovulationEnd + 1;
      const lutealEnd = cfg.cycle_length;

      return {
        menstrual: [menstrualStart, menstrualEnd],
        follicular: [follicularStart, follicularEnd],
        ovulatory: [ovulationStart, ovulationEnd],
        luteal: [lutealStart, lutealEnd],
      };
    }

    function getPhase(cycleDay, cfg) {
      const b = phaseBoundaries(cfg);
      if (cycleDay <= b.menstrual[1]) {
        return { id: "menstrual", name: "Menstrual", day_range: b.menstrual };
      }
      if ((b.follicular[0] <= cycleDay) && (cycleDay <= b.follicular[1])) {
        return { id: "follicular", name: "Follicular", day_range: b.follicular };
      }
      if ((b.ovulatory[0] <= cycleDay) && (cycleDay <= b.ovulatory[1])) {
        return { id: "ovulatory", name: "Ovulatory", day_range: b.ovulatory };
      }
      return { id: "luteal", name: "Luteal", day_range: b.luteal };
    }

    function intensityLabel(level, labels) {
      return labels[Math.max(1, Math.min(5, level)) - 1];
    }

    function phaseProfile(cycleDay, cfg) {
      const phase = getPhase(cycleDay, cfg);

      let emotionalScale = cfg.mood_swings;
      let energy = "steady";
      let social = "normal social tolerance";
      let body = "mild baseline body cues";
      let behavior = "baseline emotional thresholds";

      if (phase.id === "menstrual") {
        emotionalScale = Math.min(5, cfg.mood_swings + (cfg.cramps_strength >= 4 ? 1 : 0));
        energy = (cycleDay <= 2) ? "lower energy" : "low to moderate energy";
        social = "more inward focus and lower patience";
        body = `bleeding ${intensityLabel(cfg.blood_intensity, BLOOD_LABELS)}, cramps ${intensityLabel(cfg.cramps_strength, CRAMP_LABELS)}, possible bloating/back ache`;
        behavior = "small stressors can feel larger when pain or fatigue stacks up";
      } else if (phase.id === "follicular") {
        emotionalScale = Math.max(1, cfg.mood_swings - 1);
        energy = "rising energy and clearer focus";
        social = "higher resilience and easier conflict recovery";
        body = "lighter body symptoms for many people";
        behavior = "better bounce-back after awkward moments";
      } else if (phase.id === "ovulatory") {
        emotionalScale = cfg.mood_swings;
        energy = "higher energy and social spark";
        social = cfg.ovulation_heat
          ? "more socially bold; attraction cues can feel stronger"
          : "socially confident without added sexual-drive cues";
        body = "possible mid-cycle ache or fluid changes";
        behavior = cfg.ovulation_heat
          ? "attention and attraction may intensify reactions"
          : "keep attraction/sexual-drive baseline stable";
      } else {
        emotionalScale = Math.min(5, cfg.mood_swings + 1);
        energy = "energy may dip, especially late phase";
        social = "lower tolerance for friction; may withdraw or snap";
        body = "possible bloating, tenderness, headaches, cravings, sleep disruption";
        behavior = "criticism can feel harsher; frustration threshold is lower";
      }

      return {
        phase,
        emotionalScale,
        emotionalLabel: intensityLabel(emotionalScale, MOOD_LABELS),
        bloodLabel: intensityLabel(cfg.blood_intensity, BLOOD_LABELS),
        crampLabel: intensityLabel(cfg.cramps_strength, CRAMP_LABELS),
        energy,
        social,
        body,
        behavior,
      };
    }

    function formatStatusText() {
      const cfg = getConfig();
      const rt = ensureRuntime(cfg);
      const profile = phaseProfile(rt.cycle_day, cfg);
      const untilNextPeriod = (rt.cycle_day === 1) ? 0 : (cfg.cycle_length - rt.cycle_day + 1);

      return [
        "Period Tracker Snapshot",
        `Cycle day: ${rt.cycle_day}/${cfg.cycle_length}`,
        `Phase: ${profile.phase.name} (days ${profile.phase.day_range[0]}-${profile.phase.day_range[1]})`,
        `Bleeding intensity: ${cfg.blood_intensity}/5 (${profile.bloodLabel})`,
        `Cramps strength: ${cfg.cramps_strength}/5 (${profile.crampLabel})`,
        `Mood swings: ${cfg.mood_swings}/5 (phase-adjusted: ${profile.emotionalScale}/5, ${profile.emotionalLabel})`,
        `Ovulation heat: ${cfg.ovulation_heat ? "enabled" : "disabled"}`,
        `Energy trend: ${profile.energy}`,
        `Social trend: ${profile.social}`,
        `Body cues: ${profile.body}`,
        `Behavior cue: ${profile.behavior}`,
        `Days until next period starts: ${untilNextPeriod}`,
      ].join("\n");
    }

    function updateStatusCard() {
      const card = ensureStatusCard();
      if (card) {
        card.entry = formatStatusText();
      }
    }

    function buildContextBlock() {
      const cfg = getConfig();
      const rt = ensureRuntime(cfg);
      const profile = phaseProfile(rt.cycle_day, cfg);

      return [
        "<< Period Tracker >>",
        `Cycle day ${rt.cycle_day}/${cfg.cycle_length}; phase: ${profile.phase.name}.`,
        `Bleeding ${cfg.blood_intensity}/5 (${profile.bloodLabel}); cramps ${cfg.cramps_strength}/5 (${profile.crampLabel}); mood swings ${cfg.mood_swings}/5 (${profile.emotionalLabel} in this phase).`,
        `Ovulation heat: ${cfg.ovulation_heat ? "enabled" : "disabled"}.`,
        `Energy: ${profile.energy}.`,
        `Body: ${profile.body}.`,
        `Behavior: ${profile.behavior}.`,
        "Modeling rule: adjust emotional threshold/intensity, not core personality.",
        "",
      ].join("\n");
    }

    function advanceTurn() {
      const cfg = getConfig();
      const rt = ensureRuntime(cfg);

      if (rt.skip_advance_once) {
        rt.skip_advance_once = false;
        return { advanced: false, phase_changed: false, cycle_wrapped: false };
      }

      const previousPhase = getPhase(rt.cycle_day, cfg).id;
      rt.turn_counter += 1;
      if (rt.turn_counter % cfg.turns_per_day !== 0) {
        return { advanced: false, phase_changed: false, cycle_wrapped: false };
      }

      rt.cycle_day += 1;
      let cycleWrapped = false;
      if (rt.cycle_day > cfg.cycle_length) {
        rt.cycle_day = 1;
        cycleWrapped = true;
      }

      const nextPhase = getPhase(rt.cycle_day, cfg).id;
      return {
        advanced: true,
        phase_changed: previousPhase !== nextPhase,
        cycle_wrapped: cycleWrapped,
      };
    }

    function setCycleDay(day) {
      const cfg = getConfig();
      const rt = ensureRuntime(cfg);
      rt.cycle_day = clampInt(day, 1, cfg.cycle_length, rt.cycle_day);
      return rt.cycle_day;
    }

    function shiftCycleDay(delta) {
      const cfg = getConfig();
      const rt = ensureRuntime(cfg);
      const span = cfg.cycle_length;
      const step = clampInt(delta, -365, 365, 0);
      const zeroIndexed = ((rt.cycle_day - 1 + step) % span + span) % span;
      rt.cycle_day = zeroIndexed + 1;
      return rt.cycle_day;
    }

    function initialize() {
      const cfg = getConfig();
      ensureRuntime(cfg);
      ensureStatusCard();
      updateStatusCard();
    }

    return {
      VERSION,
      CONFIG_TITLE,
      STATUS_TITLE,
      initialize,
      getConfig,
      setConfigPatch,
      setCycleDay,
      shiftCycleDay,
      buildContextBlock,
      formatStatusText,
      updateStatusCard,
      advanceTurn,
      ensureRuntime: () => ensureRuntime(getConfig()),
      getPhase: (cycleDay) => getPhase(cycleDay, getConfig()),
      phaseProfile: (cycleDay) => phaseProfile(cycleDay, getConfig()),
    };
  })();
}

function onLibrary_PeriodTracker() {
  if (!globalThis.PeriodTracker) return;
  PeriodTracker.initialize();
}

onLibrary_PeriodTracker();
