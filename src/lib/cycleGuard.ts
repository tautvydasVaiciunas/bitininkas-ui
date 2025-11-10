type CycleRegistry = {
  marks: string[];
  loggedWarnings: Record<string, number>;
};

const getRegistry = (): CycleRegistry => {
  const globalTarget = globalThis as typeof globalThis & { __bitCycleRegistry?: CycleRegistry };
  if (!globalTarget.__bitCycleRegistry) {
    globalTarget.__bitCycleRegistry = {
      marks: [],
      loggedWarnings: {},
    };
  }
  return globalTarget.__bitCycleRegistry;
};

export const markInit = (name: string) => {
  const registry = getRegistry();
  registry.marks.push(name);

  const count = (registry.loggedWarnings[name] ?? 0) + 1;
  registry.loggedWarnings[name] = count;

  if (count > 1 && typeof console !== 'undefined') {
    console.warn(`[cycleGuard] Galima ciklinė priklausomybė inicijuojant moduliui "${name}"`);
  }
};
