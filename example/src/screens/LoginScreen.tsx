import { useState } from 'react';
import {
  Button,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

export interface LoginRequest {
  host: string;
  apiKey: string;
  secure: boolean;
  login: string;
  password: string;
}

function reachableHost(host: string): string {
  return Platform.OS === 'android'
    ? host.replace(/^localhost\b/, '10.0.2.2')
    : host;
}

export const DEFAULT_SERVER: LoginRequest = {
  host: reachableHost(process.env.EXPO_PUBLIC_TINODE_HOST ?? 'api.tinode.co'),
  apiKey: 'AQEAAAABAAD_rAp4DJh05a1HAwFT3A6K',
  secure: process.env.EXPO_PUBLIC_TINODE_SECURE !== 'false',
  login: 'alice',
  password: 'alice123',
};

export function LoginScreen({
  initial,
  onSubmit,
}: {
  initial: LoginRequest;
  onSubmit: (request: LoginRequest) => void;
}) {
  const [form, setForm] = useState(initial);
  const update = (patch: Partial<LoginRequest>) =>
    setForm((current) => ({ ...current, ...patch }));
  const canSubmit = [form.host, form.apiKey, form.login, form.password].every(
    (value) => value.trim().length > 0
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in to Tinode</Text>
      <Field
        label="Host"
        value={form.host}
        onChange={(host) => update({ host })}
      />
      <Field
        label="API key"
        value={form.apiKey}
        onChange={(apiKey) => update({ apiKey })}
      />
      <View style={styles.row}>
        <Text style={styles.label}>Use TLS</Text>
        <Switch
          value={form.secure}
          onValueChange={(secure) => update({ secure })}
        />
      </View>
      <Field
        label="Login"
        value={form.login}
        onChange={(login) => update({ login })}
      />
      <Field
        label="Password"
        value={form.password}
        secure
        onChange={(password) => update({ password })}
      />
      <Button
        title="Sign in"
        disabled={!canSubmit}
        onPress={() => onSubmit(form)}
      />
    </View>
  );
}

function Field({
  label,
  value,
  secure = false,
  onChange,
}: {
  label: string;
  value: string;
  secure?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
  },
  field: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    color: '#555',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#999',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
