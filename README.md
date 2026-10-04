# react-native-tinode

[Tinode](https://github.com/tinode/chat) chat client for React Native and the web, written in TypeScript.

It is a port of the official JavaScript SDK ([tinode-js](https://github.com/tinode/tinode-js) v0.25.4) that does not
depend on browser APIs, plus a set of React hooks.

- iOS, Android and web. Works in Expo Go and in bare React Native.
- No native code and no runtime dependencies.
- Typed protocol messages, topics, Drafty documents and contact cards.
- Pluggable storage: IndexedDB on the web, bring your own adapter on native.

## Installation

```sh
yarn add react-native-tinode
```

## Quick start

```tsx
import {
  TinodeProvider,
  useConnection,
  useLogin,
  useMeTopic,
} from 'react-native-tinode';

export default function App() {
  return (
    <TinodeProvider
      config={{
        appName: 'MyApp/1.0',
        host: 'api.tinode.co',
        apiKey: 'AQEAAAABAAD_rAp4DJh05a1HAwFT3A6K',
        secure: true,
      }}
    >
      <Main />
    </TinodeProvider>
  );
}

function Main() {
  const { status } = useConnection();
  const { loginBasic, user } = useLogin();
  const { contacts } = useMeTopic();
}
```

A complete app (login, contacts, chat with paging and typing indicator) lives in [`example/`](example).
To point it at a [local Tinode server](https://github.com/tinode/chat/tree/master/docker), which comes with test
users like `alice`/`alice123`:

```sh
EXPO_PUBLIC_TINODE_HOST=localhost:6060 EXPO_PUBLIC_TINODE_SECURE=false yarn example start
```

On the Android emulator the example rewrites `localhost` to `10.0.2.2`.

## Using the client directly

The core API follows tinode-js, so its [documentation](https://tinode.github.io/js-api/) applies.

```ts
import { createTinode } from 'react-native-tinode';

const tinode = createTinode({ appName: 'MyApp/1.0', host: 'api.example.com', apiKey: '...' });

await tinode.connect();
await tinode.loginBasic('alice', 'secret');

const me = tinode.getMeTopic();
me.onContactUpdate = (what, contact) => console.log(what, contact.name);
await me.subscribe(me.startMetaQuery().withLaterSub().withDesc().build());
```

`createTinode` fills in `platform` from `Platform.OS`. You can also use `new Tinode(config)` yourself.

## Hooks

| Hook | Returns |
| --- | --- |
| `useTinode()` | the `Tinode` instance |
| `useConnection()` | `{ status, retryIn, error }`, status is `disconnected`, `connecting`, `connected` or `authenticated` |
| `useLogin()` | `{ loginBasic, loginToken, logout, user, token, error }` |
| `useMeTopic()` | `{ contacts, isSubscribed, error }` |
| `useTopic(name)` | `{ topic, isSubscribed, desc, subscribers, subscribe, leave, error }` |
| `useMessages(name, { pageSize })` | `{ messages, hasMore, loading, loadMore, send, status, markRead, error }` |
| `useTyping(name)` | `{ typingUsers, notifyTyping }` |

Several components can use the same topic. The subscription is shared and the topic is left shortly after the last
one unmounts.

Tinode callbacks such as `onData` hold a single function. The hooks do not overwrite your own handlers: listeners are
added through `attach(target, 'onData', fn)`, which you can use too.

`useLogin` keeps the auth token in memory only. To stay signed in across launches, save `token` yourself (for example
with `expo-secure-store`) and call `loginToken` on start.

## Reconnecting

The provider reconnects when the app comes back to the foreground. To also reconnect when the network comes back,
pass NetInfo:

```tsx
import NetInfo from '@react-native-community/netinfo';

<TinodeProvider config={config} netInfo={NetInfo}>
```

## Storage

By default nothing is cached (`persist: false`).

- **Web:** `persist: true` uses IndexedDB, with the same database as the official web client.
- **Native:** implement `StorageAdapter` (for example on top of SQLite or MMKV) and pass it as `storage`.
  `MemoryAdapter` is included as a reference and for tests.

```ts
createTinode({ ...config, persist: true, storage: new MySqliteAdapter() });
```

## Files

`tinode.getLargeFileHelper()` uploads and downloads attachments.

- `upload()` accepts a web `Blob`/`File` or a React Native file object `{ uri, name, type }`.
- `download()` saves the file in the browser. On native it resolves with the `Blob`, and saving it is up to you.

## Push notifications

```ts
import messaging from '@react-native-firebase/messaging';
import { registerDeviceToken } from 'react-native-tinode';

registerDeviceToken(tinode, await messaging().getToken());
```

With Expo, use `(await Notifications.getDevicePushTokenAsync()).data`. The server sends FCM data messages; how to
show them is up to the app.

## Differences from tinode-js

- No global polyfills. Nothing touches `window`, `document` or `navigator` without checking first.
- `Tinode.setDatabaseProvider()` is gone. Use the `storage` option.
- A number of upstream bugs are fixed. See [docs/DECISIONS.md](docs/DECISIONS.md) for the reasoning behind the port.

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

Apache-2.0. Based on [tinode-js](https://github.com/tinode/tinode-js) by Tinode LLC, see [NOTICE](NOTICE).
