/**
 * Forge Bridge may wrap resolver results as `{ body: T }` depending on the
 * runtime version. This helper unwraps the value in either case.
 */
export function unwrapInvoke<T>(res: T | { body: T }): T {
  if (res !== null && typeof res === 'object' && 'body' in res) {
    return (res as { body: T }).body;
  }
  return res;
}
