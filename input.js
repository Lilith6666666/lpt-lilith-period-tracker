// Period Tracker - Input script
onLibrary_PeriodTracker();

const modifier = (text) => {
  onLibrary_PeriodTracker();

  const input = String(text || "");
  const command = input.trim();
  if (!/^\/period\b/i.test(command)) {
    return { text: input };
  }

  const rt = PeriodTracker.ensureRuntime();
  let response = "";

  if (/^\/period\s*$/i.test(command) || /^\/period\s+help$/i.test(command)) {
    response = [
      "Period Tracker commands:",
      "- /period status",
      "- /period set blood <1-5>",
      "- /period set cramps <1-5>",
      "- /period set mood <1-5>",
      "- /period set heat <y|n>",
      "- /period set day <1-cycle_length>",
      "- /period nextday [N]",
    ].join("\n");
  } else if (/^\/period\s+status$/i.test(command)) {
    response = PeriodTracker.formatStatusText();
  } else {
    const blood = command.match(/^\/period\s+set\s+blood\s+([1-5])$/i);
    const cramps = command.match(/^\/period\s+set\s+cramps\s+([1-5])$/i);
    const mood = command.match(/^\/period\s+set\s+mood\s+([1-5])$/i);
    const heat = command.match(/^\/period\s+set\s+heat\s+([a-z0-9]+)$/i);
    const day = command.match(/^\/period\s+set\s+day\s+(\d+)$/i);
    const next = command.match(/^\/period\s+nextday(?:\s+(\d+))?$/i);

    if (blood) {
      PeriodTracker.setConfigPatch({ blood_intensity: Number.parseInt(blood[1], 10) });
      response = "Updated blood_intensity.";
    } else if (cramps) {
      PeriodTracker.setConfigPatch({ cramps_strength: Number.parseInt(cramps[1], 10) });
      response = "Updated cramps_strength.";
    } else if (mood) {
      PeriodTracker.setConfigPatch({ mood_swings: Number.parseInt(mood[1], 10) });
      response = "Updated mood_swings.";
    } else if (heat) {
      const val = String(heat[1]).toLowerCase();
      if (["y", "yes", "true", "1", "on"].includes(val)) {
        PeriodTracker.setConfigPatch({ ovulation_heat: true });
        response = "Updated ovulation_heat to enabled.";
      } else if (["n", "no", "false", "0", "off"].includes(val)) {
        PeriodTracker.setConfigPatch({ ovulation_heat: false });
        response = "Updated ovulation_heat to disabled.";
      } else {
        response = "Invalid heat value. Use y or n.";
      }
    } else if (day) {
      const setDay = PeriodTracker.setCycleDay(Number.parseInt(day[1], 10));
      response = `Cycle day set to ${setDay}.`;
    } else if (next) {
      const step = Number.parseInt(next[1] || "1", 10);
      const setDay = PeriodTracker.shiftCycleDay(step);
      response = `Advanced cycle day by ${step}. Current day: ${setDay}.`;
    } else {
      response = "Unknown command. Use /period help";
    }
  }

  PeriodTracker.updateStatusCard();
  rt.command_center = `<< Period Tracker >>\n${response}`;
  rt.skip_advance_once = true;

  return { text: " " };
};

modifier(text);
