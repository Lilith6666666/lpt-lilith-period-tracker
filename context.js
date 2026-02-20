// Period Tracker - Context script
onLibrary_PeriodTracker();

const modifier = (text) => {
  onLibrary_PeriodTracker();

  const block = PeriodTracker.buildContextBlock();
  const result = { text: `${block}${text}` };

  // Preserve upstream stop flag if it exists in the script sandbox.
  if (typeof stop !== "undefined") {
    result.stop = stop;
  }

  return result;
};

modifier(text);
