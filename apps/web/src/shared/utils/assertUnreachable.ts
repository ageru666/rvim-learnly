/** Exhaustiveness guard for `switch` over unions: `default: return assertUnreachable(value);` */
export function assertUnreachable(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}
