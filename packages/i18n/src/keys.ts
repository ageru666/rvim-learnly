import type { uk } from './messages/uk.js';

type Source = typeof uk;

/** The dictionary shape with every leaf widened to `string`; the English dictionary satisfies it. */
export type DeepStringShape<T> = {
  readonly [K in keyof T]: T[K] extends string ? string : DeepStringShape<T[K]>;
};

export type Messages = DeepStringShape<Source>;

type Leaves<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

/** Every dotted path to a message, e.g. `site.header.catalog`. */
export type MessageKey = Leaves<Source>;

type ValueAt<T, K extends string> = K extends `${infer Head}.${infer Rest}`
  ? Head extends keyof T
    ? ValueAt<T[Head], Rest>
    : never
  : K extends keyof T
    ? T[K]
    : never;

type Trim<S extends string> = S extends ` ${infer R}`
  ? Trim<R>
  : S extends `${infer R} `
    ? Trim<R>
    : S;

type PlaceholderName<S extends string> = S extends `${infer Name},${string}`
  ? Trim<Name>
  : S extends `#${string}` | `${string} ${string}`
    ? never
    : Trim<S>;

type Placeholders<S> = S extends `${string}{${infer Inner}}${infer Rest}`
  ? PlaceholderName<Inner> | Placeholders<Rest>
  : never;

export type MessagePlaceholders<K extends MessageKey> = Placeholders<ValueAt<Source, K>>;

export type ParamValue = string | number;

export type MessageParams<K extends MessageKey> = Record<MessagePlaceholders<K>, ParamValue>;

/** Messages without placeholders take no params; the others require every placeholder. */
export type MessageArgs<K extends MessageKey> = [MessagePlaceholders<K>] extends [never]
  ? []
  : [params: MessageParams<K>];
