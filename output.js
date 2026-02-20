// Period Tracker - Output script
onLibrary_PeriodTracker();

const modifier = (text) => {
  onLibrary_PeriodTracker();

  const rt = PeriodTracker.ensureRuntime();

  const commandMessage = String(rt.command_center || "").trim();
  if (commandMessage) {
    rt.command_center = "";
    PeriodTracker.updateStatusCard();
    return { text: commandMessage };
  }

  const movement = PeriodTracker.advanceTurn();
  PeriodTracker.updateStatusCard();

  let output = String(text || "");
  if (movement.cycle_wrapped) {
    output += "\n\n<< Period Tracker: new cycle started (day 1). >>";
  } else if (movement.advanced && movement.phase_changed) {
    const phase = PeriodTracker.getPhase(rt.cycle_day);
    output += `\n\n<< Period Tracker: entered ${phase.name} phase (cycle day ${rt.cycle_day}). >>`;
  }

  return { text: output };
};

modifier(text);
