# Persistence

`react-native-tinode` can keep a local cache of topics, users, subscriptions, messages and the delete log. With a
cache, your app can show the chat list and recent messages at once when it starts, chats opened before stay
readable offline, and the client asks the server only for what changed.

The cache is never the source of truth. The server is. Deleting the cache loses nothing.

## Which store to use

| Your app | Use | Guide |
| --- | --- | --- |
| Expo (Expo Go or a development build) | `expo-sqlite/kv-store` | [expo-sqlite.md](expo-sqlite.md) |
| Bare React Native, or an Expo development build that wants the fastest store | `react-native-mmkv` | [mmkv.md](mmkv.md) |
| Already uses AsyncStorage | `@react-native-async-storage/async-storage` | [async-storage.md](async-storage.md) |
| Web | nothing to do: `persist: true` uses IndexedDB | below |
| Thousands of messages per chat kept offline | SQLite adapter, planned for 0.2.0 | [issue #1](https://github.com/amerllica/react-native-tinode/issues/1) |

The login token does not belong in this cache. See [auth-token.md](auth-token.md).

## How it works

You pass a `StorageAdapter` as `storage` and turn on `persist`:

```ts
import { createTinode, KeyValueAdapter } from 'react-native-tinode';

const client = createTinode({
  appName: 'MyApp/1.0',
  host: 'chat.example.com',
  apiKey: 'YOUR_API_KEY',
  persist: true,
  storage: new KeyValueAdapter(store),
});
```

`KeyValueAdapter` works with any store that has `getItem`, `setItem`, `removeItem` and `getAllKeys`, sync or async.
The library does not depend on any of these stores. You install the one you pick.

- On start, it reads every cached record into memory, then serves all queries from memory.
- Every change is written to the store right away.
- If the store has a batch read (`multiGet` or `getMany`), the start-up read uses it.

### Sharing a store

All keys start with `tinode/`, so the cache can share a store with the rest of your app. `clearStorage()` and
`logout()` remove only those keys. To run two clients on one store, give each its own prefix:

```ts
new KeyValueAdapter(store, { prefix: 'tinode-work' });
```

### Web

On the web you do not need a `storage` option. `persist: true` uses IndexedDB, with the same database as the
official Tinode web app. If the same code runs on web and native, split the store by platform file:

```ts
// storage.native.ts
import Storage from 'expo-sqlite/kv-store';
import { KeyValueAdapter } from 'react-native-tinode';

export const storage = new KeyValueAdapter(Storage);
```

```ts
// storage.ts (web)
import type { StorageAdapter } from 'react-native-tinode';

export const storage: StorageAdapter | undefined = undefined;
```

The [example app](../../example/src) does exactly this.

### Signing out

`logout()` from `useLogin()` disconnects and clears the cache. If you sign out another way, call
`client.clearStorage()` yourself, so the next user does not see the previous user's chats.

## Limits

- The whole cache is held in memory while the app runs. That is fine for contacts and recent chats: a few
  thousand messages in total.
- Nothing is evicted. The cache grows with every message the app has seen, the same as the official web client.
- For large offline histories, wait for the SQLite adapter ([issue #1](https://github.com/amerllica/react-native-tinode/issues/1)),
  or implement `StorageAdapter` yourself on top of a database.
