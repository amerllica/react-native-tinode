import Storage from 'expo-sqlite/kv-store';
import { KeyValueAdapter } from 'react-native-tinode';

export const storage = new KeyValueAdapter(Storage);
