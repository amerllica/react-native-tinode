# Decisions

## 1. Wrap `tinode-sdk` instead of porting it

Until 0.1.x this package carried its own TypeScript port of tinode-js, because `tinode-sdk` assumed a browser and had
IndexedDB hard-wired. [tinode/tinode-js#103](https://github.com/tinode/tinode-js/pull/103) moved the platform
dependencies into the SDK's config: `storage` (any storage adapter), `netInfo` (reconnect when the network is back)
and `network` (`WebSocket` and `XMLHttpRequest`). With that merged, the port has no reason to exist: protocol fixes
now arrive with `tinode-sdk` instead of being ported by hand.

This package keeps only what the SDK does not do: React providers and hooks, TypeScript types, and two Hermes
polyfills (section 4).

## 2. `tinode-sdk` is pinned to a GitHub commit until the next release

The merged work is on the tinode-js `devel` branch and not on npm yet, so `package.json` depends on
`github:tinode/tinode-js#commit=<sha>`. Yarn downloads that commit, runs `npm install` and `npm pack` in it once, and
stores the packed checksum in `yarn.lock`, so CI installs are reproducible. When a release with the change is on npm,
replace the pin with a version range.

## 3. Types live in `src/sdk`

`tinode-sdk` is plain JavaScript and ships no types.

- `src/sdk/types.ts` declares the SDK surface: classes as `declare class` (so each name is both the instance type and
  the constructor), plus the protocol and storage types. It started as the declarations of the old port, which had
  the same API, and is aligned with upstream where they differ (`network` option, `setDatabaseProvider`, the socket
  shape upstream uses).
- `src/sdk/tinode-sdk.d.ts` tells TypeScript what the untyped module exports, using only inline imports from
  `./types`, so emitted declarations never refer to `tinode-sdk` itself.
- `src/sdk/index.ts` re-exports the values with those types. Constants that upstream only has as `Tinode` statics
  (`MESSAGE_STATUS_*`, `DEL_CHAR`) are exported as plain constants.

Upstream does not export `Topic`, `TopicMe`, `TopicFnd`, `CommError`, `MetaGetBuilder` or `LargeFileHelper`, so they
are types only. Instances come from the client (`getTopic`, `getMeTopic`, `startMetaQuery`, `getLargeFileHelper`).
`isCommError` replaces `instanceof CommError`. `TOPIC_ME`, `LOCAL_SEQID` and `DEFAULT_MESSAGES_PAGE` are not exported
upstream either; the React layer keeps its own copies in `src/react/constants.ts`.

When `tinode-sdk` changes its API, update `src/sdk/types.ts` by hand. `src/sdk/__tests__/sdk.test.ts` loads the real
SDK, so a missing export fails there.

## 4. Hermes polyfills

`tinode-sdk` calls `new Intl.Segmenter()` when it loads (Drafty) and uses `TextDecoder` for vCard import. Hermes
has neither. `src/platform` installs a grapheme-only `Intl.Segmenter` and a UTF-8-only `TextDecoder`, each only when
the global is missing, and `src/index.tsx` imports it before the SDK. `package.json` lists `src/platform` and
`lib/module/platform` in `sideEffects`, so web bundlers keep the import.

These go away when tinode-js ships its own fallbacks (planned as the next upstream PR, together with downloads without
a DOM). Until then `LargeFileHelper.download()` works on the web only.

## 5. React layer

Hooks live in `src/react`. Tinode callbacks are single-slot properties, so the hooks attach listeners through a small
multiplexer instead of overwriting app callbacks.

NetInfo is not a dependency, not even an optional one. A guarded `require` of an optional package breaks bare React
Native builds, because Metro defaults `allowOptionalDependencies` to `false`. Apps that want a fast reconnect pass
their NetInfo module in the config (`netInfo: NetInfo`); the SDK then retries at once when the network comes back.
The provider still reconnects on `AppState` change.

## 6. Storage

Storage adapters come from `tinode-sdk`: `IndexedDBAdapter` (the default in browsers when `persist` is on),
`KeyValueAdapter` over any key-value store the app already has (`expo-sqlite/kv-store`, MMKV through `fromMMKV`,
AsyncStorage) and `MemoryAdapter`. This package imports none of the stores, so it still runs in Expo Go.

## 7. License

This package is released under Apache-2.0. It depends on tinode-sdk (Apache-2.0), with attribution in `NOTICE`.
