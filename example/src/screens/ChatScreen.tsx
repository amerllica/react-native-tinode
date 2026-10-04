import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMessages, useTyping } from 'react-native-tinode';
import { describeError, messageText, shortTime } from './format';

const STATUS_LABELS: Record<number, string> = {
  10: 'queued',
  20: 'sending',
  30: 'failed',
  40: 'failed',
  50: 'sent',
  60: 'delivered',
  70: 'read',
};

export function ChatScreen({
  topic,
  title,
  onBack,
}: {
  topic: string;
  title: string;
  onBack: () => void;
}) {
  const { messages, loadMore, hasMore, loading, send, status, markRead } =
    useMessages(topic);
  const { typingUsers, notifyTyping } = useTyping(topic);
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);

  const newestFirst = useMemo(() => [...messages].reverse(), [messages]);
  const newestSeq = newestFirst[0]?.seq;

  useEffect(() => {
    if (newestSeq !== undefined) {
      markRead(newestSeq);
    }
  }, [markRead, newestSeq]);

  const submit = () => {
    const text = draft.trim();
    if (!text) {
      return;
    }
    setDraft('');
    setSendError(null);
    send(text).catch((error: unknown) => setSendError(describeError(error)));
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Button title="Back" onPress={onBack} />
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <FlatList
        inverted
        data={newestFirst}
        keyExtractor={(msg) => String(msg.seq)}
        onEndReached={() => {
          if (hasMore) {
            loadMore();
          }
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={loading ? <ActivityIndicator /> : undefined}
        renderItem={({ item }) => {
          const label = STATUS_LABELS[status(item)];
          const mine = label !== undefined;
          return (
            <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
              <Text>{messageText(item.content)}</Text>
              <Text style={styles.meta}>
                {shortTime(item.ts)}
                {label ? ` · ${label}` : ''}
              </Text>
            </View>
          );
        }}
      />
      <Text style={styles.typing}>
        {typingUsers.length > 0 ? 'typing…' : ' '}
      </Text>
      {sendError ? <Text style={styles.error}>{sendError}</Text> : null}
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={draft}
          placeholder="Message"
          onChangeText={(text) => {
            setDraft(text);
            notifyTyping();
          }}
          onSubmitEditing={submit}
          returnKeyType="send"
        />
        <Button title="Send" disabled={!draft.trim()} onPress={submit} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  bubble: {
    maxWidth: '80%',
    marginHorizontal: 12,
    marginVertical: 4,
    padding: 10,
    borderRadius: 12,
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: '#dcf1ff',
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f1f1',
  },
  meta: {
    marginTop: 4,
    fontSize: 11,
    color: '#777',
  },
  typing: {
    paddingHorizontal: 16,
    color: '#777',
    fontStyle: 'italic',
  },
  error: {
    paddingHorizontal: 16,
    color: '#b00020',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
  },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#999',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});
