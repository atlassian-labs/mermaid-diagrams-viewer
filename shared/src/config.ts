export const CONFIG_FIELD = 'index';
export type Config = { [CONFIG_FIELD]?: number };

export function getIndexFromConfig(
  config: Config | undefined,
): number | undefined {
  const index = config?.index;
  if (Number.isSafeInteger(index) && index >= 0) {
    return index;
  }
  return undefined;
}
