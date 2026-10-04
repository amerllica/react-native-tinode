import {
  Button,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useMeTopic,
  type Contact,
  type ConnectionStatus,
} from 'react-native-tinode';
import { cardName, describeError } from './format';

export function ContactsScreen({
  status,
  onOpen,
  onSignOut,
}: {
  status: ConnectionStatus;
  onOpen: (topic: string, title: string) => void;
  onSignOut: () => void;
}) {
  const { contacts, error } = useMeTopic();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chats</Text>
        <Text style={styles.status}>{status}</Text>
        <Button title="Sign out" onPress={onSignOut} />
      </View>
      {error ? <Text style={styles.error}>{describeError(error)}</Text> : null}
      <FlatList
        data={contacts}
        keyExtractor={(contact) => contact.name}
        renderItem={({ item }) => <ContactRow contact={item} onOpen={onOpen} />}
        ListEmptyComponent={<Text style={styles.empty}>No chats yet</Text>}
      />
    </View>
  );
}

function ContactRow({
  contact,
  onOpen,
}: {
  contact: Contact;
  onOpen: (topic: string, title: string) => void;
}) {
  const title = cardName(contact.public, contact.name);
  return (
    <Pressable style={styles.row} onPress={() => onOpen(contact.name, title)}>
      <View style={[styles.dot, contact.online && styles.online]} />
      <Text style={styles.name} numberOfLines={1}>
        {title}
      </Text>
      {contact.unread > 0 ? (
        <Text style={styles.badge}>{contact.unread}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '600',
  },
  status: {
    color: '#777',
  },
  error: {
    color: '#b00020',
    padding: 16,
  },
  empty: {
    padding: 24,
    textAlign: 'center',
    color: '#777',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ccc',
  },
  online: {
    backgroundColor: '#2e7d32',
  },
  name: {
    flex: 1,
    fontSize: 16,
  },
  badge: {
    minWidth: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    overflow: 'hidden',
    backgroundColor: '#1565c0',
    color: '#fff',
    textAlign: 'center',
  },
});
