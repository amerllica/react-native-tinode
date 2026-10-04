# Decisions

## 1. Re-implement tinode-js in TypeScript instead of wrapping `tinode-sdk`

The first plan was to wrap the `tinode-sdk` npm package and add types and shims around it.
We chose a full TypeScript port instead.

Reasons:

- `tinode-sdk` assumes a browser at many points: `window.location` in `LargeFileHelper`,
  `document` for downloads, `indexedDB` for the cache, `Intl.Segmenter` in Drafty,
  `navigator.userAgent` in the constructor, and an import-time shim that writes `global.window`.
  Shimming these from outside the bundle is fragile and changes global state for the whole app.
- The SDK has no types. Hand-written `.d.ts` files drift from the runtime.
- Storage is hard-wired to IndexedDB. A port lets us put storage behind an adapter now,
  without an upstream change.

Cost: protocol fixes in upstream do not arrive automatically. Track upstream releases and port
relevant changes by hand. The port targets tinode-js **v0.25.4**; `VERSION` in
`src/core/config.ts` is the version sent to the server and must match the ported feature level.

## 2. Module layout mirrors upstream

`src/core/*.ts` keeps upstream file names, class names, method names and argument order.
This keeps the port easy to diff against upstream releases and keeps the public API familiar to
existing Tinode users.

## 3. Storage is an adapter

`StorageAdapter` (`src/core/storage/storage-adapter.ts`) is a small record-based interface with
no SDK classes in it. `PersistentCache` does all Topic ↔ record mapping and keeps the upstream
`DB` method names.

- Web: `IndexedDBAdapter` uses the same database name, version and schema as upstream, so an
  existing browser cache stays valid.
- Native: no adapter ships in v1, so the library has zero native dependencies and runs in Expo Go.
  Pass `storage` in the config to use your own adapter (SQLite, MMKV, ...).
- `MemoryAdapter` exists for tests and for a session-only cache.

`Tinode.setDatabaseProvider()` from upstream is removed. Use the `storage` config key.

## 4. Platform rules

- No browser globals without a `typeof` guard. No writes to globals.
- `Intl.Segmenter` is missing on Hermes: Drafty uses a fallback grapheme splitter.
- `TextDecoder` may be missing: TheCard has a UTF-8 fallback.
- `new Blob([ArrayBuffer])` and object URLs for such Blobs throw on React Native: code falls
  back to `data:` URIs.
- `LargeFileHelper.download()` saves the file through the DOM on web (upstream behaviour). Where
  there is no DOM it resolves with the downloaded `Blob`; saving it is the app's job.
- `LargeFileHelper.upload()` accepts a React Native file descriptor `{ uri, name, type }` as
  well as a web `Blob`/`File`.

## 5. React layer

Hooks live in `src/react`. Tinode callbacks are single-slot properties, so the hooks attach
listeners through a small multiplexer instead of overwriting app callbacks.
NetInfo is not a dependency, not even an optional one. A guarded `require` of an optional package
breaks bare React Native builds, because Metro defaults `allowOptionalDependencies` to `false`.
Apps that want reconnect on network change pass their NetInfo module to the provider
(`netInfo={NetInfo}`). Without it, reconnect still happens on `AppState` change and through the
SDK's own backoff.

## 6. License

The port is a derivative work of tinode-js (Apache-2.0). This package is released under
Apache-2.0, with attribution in `NOTICE`.
