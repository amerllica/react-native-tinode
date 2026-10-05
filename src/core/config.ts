export const PACKAGE_VERSION = '0.1.1';
export const PROTOCOL_VERSION = '0';
export const VERSION = '0.25.4';
export const LIBRARY = 'react-native-tinode/' + PACKAGE_VERSION;

export const TOPIC_NEW = 'new';
export const TOPIC_NEW_CHAN = 'nch';
export const TOPIC_ME = 'me';
export const TOPIC_FND = 'fnd';
export const TOPIC_SYS = 'sys';
export const TOPIC_SLF = 'slf';
export const TOPIC_CHAN = 'chn';
export const TOPIC_GRP = 'grp';
export const TOPIC_P2P = 'p2p';
export const USER_NEW = 'new';

export const LOCAL_SEQID = 0xfffffff;

export const MESSAGE_STATUS_NONE = 0;
export const MESSAGE_STATUS_QUEUED = 10;
export const MESSAGE_STATUS_SENDING = 20;
export const MESSAGE_STATUS_FAILED = 30;
export const MESSAGE_STATUS_FATAL = 40;
export const MESSAGE_STATUS_SENT = 50;
export const MESSAGE_STATUS_RECEIVED = 60;
export const MESSAGE_STATUS_READ = 70;
export const MESSAGE_STATUS_TO_ME = 80;

export const EXPIRE_PROMISES_TIMEOUT = 5_000;
export const EXPIRE_PROMISES_PERIOD = 1_000;

export const RECV_TIMEOUT = 100;

export const DEFAULT_MESSAGES_PAGE = 24;

export const DEL_CHAR = '␡';

export const MAX_PINNED_COUNT = 5;

export const TAG_ALIAS = 'alias:';
export const TAG_EMAIL = 'email:';
export const TAG_PHONE = 'tel:';

export const BACKOFF_BASE = 2_000;
export const BACKOFF_MAX_ITER = 10;
export const BACKOFF_JITTER = 0.3;
