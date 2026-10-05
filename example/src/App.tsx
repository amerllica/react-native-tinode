import { useMemo, useState } from 'react';
import { Platform, StatusBar, StyleSheet, View } from 'react-native';
import { createTinode, TinodeProvider } from 'react-native-tinode';
import {
  DEFAULT_SERVER,
  LoginScreen,
  type LoginRequest,
} from './screens/LoginScreen';
import { SignedInScreen } from './screens/SignedInScreen';
import { storage } from './storage';

const APP_NAME = 'TinodeExample/1.0';
const IOS_NOTCH_INSET = 56;
const TOP_INSET = Platform.select({
  android: StatusBar.currentHeight ?? 0,
  ios: IOS_NOTCH_INSET,
  default: 0,
});

export default function App() {
  const [request, setRequest] = useState<LoginRequest | null>(null);

  return (
    <View style={styles.container}>
      {request ? (
        <Session request={request} onSignOut={() => setRequest(null)} />
      ) : (
        <LoginScreen initial={DEFAULT_SERVER} onSubmit={setRequest} />
      )}
    </View>
  );
}

function Session({
  request,
  onSignOut,
}: {
  request: LoginRequest;
  onSignOut: () => void;
}) {
  const client = useMemo(
    () =>
      createTinode({
        appName: APP_NAME,
        host: request.host,
        apiKey: request.apiKey,
        secure: request.secure,
        persist: true,
        storage,
      }),
    [request.host, request.apiKey, request.secure]
  );

  return (
    <TinodeProvider client={client}>
      <SignedInScreen
        login={request.login}
        password={request.password}
        onSignOut={onSignOut}
      />
    </TinodeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: TOP_INSET,
    backgroundColor: '#fff',
  },
});
