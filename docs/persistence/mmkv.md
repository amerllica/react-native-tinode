# Persistence with `react-native-mmkv`

The fastest store. Reads and writes are synchronous. MMKV is a native module, so it does **not** run in Expo Go.
Use it in a bare React Native app or in an Expo development build.

## Install

```sh
yarn add react-native-mmkv
```

Then follow the [MMKV install guide](https://github.com/mrousavy/react-native-mmkv) for your setup (pods for bare
iOS, `expo prebuild` for Expo).

## Set up

MMKV method names are different from AsyncStorage, so wrap the instance with `fromMMKV`:

```ts
import { createMMKV } from 'react-native-mmkv';
import { createTinode, fromMMKV, KeyValueAdapter } from 'react-native-tinode';

export const client = createTinode({
  appName: 'MyApp/1.0',
  host: 'chat.example.com',
  apiKey: 'YOUR_API_KEY',
  persist: true,
  storage: new KeyValueAdapter(fromMMKV(createMMKV({ id: 'tinode' }))),
});
```

On MMKV v3 the instance is created with `new MMKV({ id: 'tinode' })` instead. `fromMMKV` accepts both versions.

A separate instance (`id: 'tinode'`) keeps the chat cache in its own file. You can also pass your app's existing
instance: the cache uses only keys that start with `tinode/`.

## Encryption

MMKV can encrypt its file with `encryptionKey`. Whether you need it is your app's choice. The cache holds message
text and contact names, but not the login token.
