/** Minimal Cloudflare / DOM shims so `@hope/api` type imports resolve under Expo's TS config. */

declare type Hyperdrive = {
  connectionString: string;
};

interface FormData {
  entries(): IterableIterator<[string, FormDataEntryValue]>;
}
