# Keeping the user signed in

The chat cache does not store the login token, and neither does the client. To sign the user in again on the next
start, save the token yourself in a secure store, then sign in with it.

Use a secure store for the token, not the chat cache:

- Expo: [`expo-secure-store`](https://docs.expo.dev/versions/latest/sdk/securestore/) (runs in Expo Go).
- Bare React Native: [`react-native-keychain`](https://github.com/oblador/react-native-keychain).

## Example with `expo-secure-store`

```tsx
import * as SecureStore from 'expo-secure-store';
import { useEffect } from 'react';
import { CommError, useLogin } from 'react-native-tinode';

const TOKEN_KEY = 'tinode-token';
const UNAUTHORIZED = 401;

function isRejectedToken(error: unknown) {
  return error instanceof CommError && error.code === UNAUTHORIZED;
}

export function useRememberedLogin() {
  const login = useLogin();
  const { loginToken, token } = login;

  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY).then((saved) => {
      if (saved) {
        loginToken(saved).catch((error: unknown) => {
          if (isRejectedToken(error)) {
            SecureStore.deleteItemAsync(TOKEN_KEY);
          }
        });
      }
    });
  }, [loginToken]);

  useEffect(() => {
    if (token) {
      SecureStore.setItemAsync(TOKEN_KEY, token.token);
    }
  }, [token]);

  const logout = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await login.logout();
  };

  return { ...login, logout };
}
```

- `token.expires` tells when the token stops working. The server rejects an expired token with 401, and then the
  saved one is deleted.
- Any other error, for example no network at start, keeps the saved token, so you can try again later, for example
  when `useConnection().status` becomes `connected`. After one successful sign-in, the client signs in again by
  itself on every reconnect.
- `logout()` also clears the chat cache, so the next user starts empty.
