export interface ParamConfig {
  name: string;
  type: "number" | "string" | "boolean";
  default: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  description?: string;
}

// regex patterns kept for future range extraction

export function extractParams(source: string): ParamConfig[] {
  const params: ParamConfig[] = [];
  const lines = source.split("\n");

  const seenVars = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();

    const rangeMatch = /([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([\d.]+)\s*;\s*\/\/\s*\[([\d.]+),\s*([\d.]+)\]/.exec(
      trimmed
    );
    if (rangeMatch) {
      const [, name, defaultVal, minVal, maxVal] = rangeMatch;
      if (!seenVars.has(name)) {
        params.push({
          name,
          type: "number",
          default: parseFloat(defaultVal),
          min: parseFloat(minVal),
          max: parseFloat(maxVal),
          step: estimateStep(parseFloat(minVal), parseFloat(maxVal)),
        });
        seenVars.add(name);
      }
      continue;
    }

    const numberMatch = /([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([\d.]+)\s*;/.exec(
      trimmed
    );
    if (numberMatch && !trimmed.includes("//")) {
      const [, name, defaultVal] = numberMatch;
      if (
        !seenVars.has(name) &&
        name !== "$fa" &&
        name !== "$fs" &&
        name !== "$fn" &&
        name !== "$t"
      ) {
        const val = parseFloat(defaultVal);
        params.push({
          name,
          type: "number",
          default: val,
          min: 0,
          max: val > 0 ? val * 5 : 100,
          step: estimateStep(0, val > 0 ? val * 5 : 100),
        });
        seenVars.add(name);
      }
    }
  }

  return params;
}

function estimateStep(min: number, max: number): number {
  const range = max - min;
  if (range <= 1) return 0.01;
  if (range <= 10) return 0.1;
  if (range <= 100) return 1;
  if (range <= 1000) return 10;
  return 100;
}

export function applyParams(source: string, params: ParamConfig[]): string {
  let result = source;

  for (const param of params) {
    const regex = new RegExp(`\\b${param.name}\\s*=\\s*[\\d.]+\\s*;`, "g");
    result = result.replace(regex, `${param.name} = ${param.default};`);
  }

  return result;
}