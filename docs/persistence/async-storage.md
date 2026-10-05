# Persistence with AsyncStorage

Use this if your app already uses `@react-native-async-storage/async-storage`. It runs in Expo Go and in bare apps.
If you are starting fresh, prefer [`expo-sqlite/kv-store`](expo-sqlite.md) (Expo) or [MMKV](mmkv.md) (bare):
AsyncStorage is slower, and AsyncStorage 2 limits its total size on Android to about 6 MB by default.

## Install

```sh
npx expo install @react-native-async-storage/async-storage
```

In a bare app, use `yarn add @react-native-async-storage/async-storage` and install the pods.

## Set up

AsyncStorage already has the methods `KeyValueAdapter` needs, so pass it as it is:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createTinode, KeyValueAdapter } from 'react-native-tinode';

export const client = createTinode({
  appName: 'MyApp/1.0',
  host: 'chat.example.com',
  apiKey: 'YOUR_API_KEY',
  persist: true,
  storage: new KeyValueAdapter(AsyncStorage),
});
```

`KeyValueAdapter` uses `getMany` (AsyncStorage 3) or `multiGet` (AsyncStorage 2) to load the cache in one read.

With AsyncStorage 3 you can keep the chat cache in its own database:

```ts
import { createAsyncStorage } from '@react-native-async-storage/async-storage';

new KeyValueAdapter(createAsyncStorage('tinode'));
```
