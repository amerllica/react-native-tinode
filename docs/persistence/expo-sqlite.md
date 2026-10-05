# Persistence with `expo-sqlite/kv-store`

The best default for Expo apps. It runs in **Expo Go** and in development builds, and it stores data in SQLite, so
there is no size limit like AsyncStorage has on Android.

## Install

```sh
npx expo install expo-sqlite
```

## Set up

```ts
import Storage from 'expo-sqlite/kv-store';
import { createTinode, KeyValueAdapter } from 'react-native-tinode';

export const client = createTinode({
  appName: 'MyApp/1.0',
  host: 'chat.example.com',
  apiKey: 'YOUR_API_KEY',
  persist: true,
  storage: new KeyValueAdapter(Storage),
});
```

`Storage` is the module's default store. `KeyValueAdapter` uses its `multiGet` to load the cache in one read.

## Web

On the web, `persist: true` uses IndexedDB and needs no store. Put the store in a `.native.ts` file and leave the
web file empty, as shown in [README.md](README.md#web).

## Check that it works

Sign in and open a chat. Close the app completely, open it, sign in again, then turn off the network and open the
same chat. Its messages are still there, read from the cache.
