import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useConnection, useLogin } from 'react-native-tinode';
import { ChatScreen } from './ChatScreen';
import { ContactsScreen } from './ContactsScreen';
import { describeError } from './format';

interface OpenChat {
  topic: string;
  title: string;
}

export function SignedInScreen({
  login,
  password,
  onSignOut,
}: {
  login: string;
  password: string;
  onSignOut: () => void;
}) {
  const { loginBasic, logout, user } = useLogin();
  const { status } = useConnection();
  const [failure, setFailure] = useState<string | null>(null);
  const [chat, setChat] = useState<OpenChat | null>(null);

  useEffect(() => {
    loginBasic(login, password).catch((error: unknown) =>
      setFailure(describeError(error))
    );
  }, [loginBasic, login, password]);

  const signOut = () => {
    logout().finally(onSignOut);
  };

  if (failure) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Sign in failed: {failure}</Text>
        <Button title="Back" onPress={onSignOut} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.status}>{status}</Text>
      </View>
    );
  }

  if (chat) {
    return (
      <ChatScreen
        topic={chat.topic}
        title={chat.title}
        onBack={() => setChat(null)}
      />
    );
  }

  return (
    <ContactsScreen
      status={status}
      onOpen={(topic, title) => setChat({ topic, title })}
      onSignOut={signOut}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  status: {
    color: '#777',
  },
  error: {
    color: '#b00020',
    textAlign: 'center',
  },
});
