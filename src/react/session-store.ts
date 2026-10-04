import type { AuthToken } from '../core/types';
import { ExternalStore, detachAll, ignore } from './external-store';
import { attach } from './multiplex';
import type { ClientPort } from './ports';

export type ConnectionStatus =
  'disconnected' | 'connecting' | 'connected' | 'authenticated';

export interface SessionState {
  readonly status: ConnectionStatus;
  readonly retryIn?: number;
  readonly error?: unknown;
  readonly user?: string;
  readonly token?: AuthToken;
}

const RECONNECT_STOPPED = -1;
const SESSION_KEYS = ['status', 'retryIn', 'error', 'user', 'token'] as const;

function liveStatus(client: ClientPort): ConnectionStatus {
  if (!client.isConnected()) {
    return 'disconnected';
  }
  return client.isAuthenticated() ? 'authenticated' : 'connected';
}

export class SessionStore extends ExternalStore<SessionState> {
  readonly client: ClientPort;
  #reloginToken: string | null = null;
  #wantsConnection = false;

  constructor(client: ClientPort) {
    super({ status: liveStatus(client) });
    this.client = client;
  }

  async connect(): Promise<void> {
    this.#wantsConnection = true;
    if (this.client.isConnected()) {
      return;
    }
    this.#update({ status: 'connecting', error: undefined });
    try {
      await this.client.connect();
    } catch (error) {
      this.#update({ status: 'disconnected', error });
      throw error;
    }
    this.#update({ status: liveStatus(this.client) });
  }

  reconnect(): void {
    if (!this.#wantsConnection || this.client.isConnected()) {
      return;
    }
    this.#update({ status: 'connecting', retryIn: undefined });
    this.client.reconnect(false);
  }

  async loginBasic(uname: string, password: string): Promise<void> {
    await this.connect();
    await this.#login(this.client.loginBasic(uname, password));
  }

  async loginToken(token: string): Promise<void> {
    await this.connect();
    await this.#login(this.client.loginToken(token));
  }

  async logout(): Promise<void> {
    this.#reloginToken = null;
    this.#wantsConnection = false;
    this.client.disconnect();
    this.#update({
      status: 'disconnected',
      retryIn: undefined,
      error: undefined,
      user: undefined,
      token: undefined,
    });
    await this.client.clearStorage();
  }

  protected listen(): () => void {
    this.#update({ status: liveStatus(this.client) });
    return detachAll([
      attach(this.client, 'onConnect', () => this.#handleConnect()),
      attach(this.client, 'onDisconnect', (error) =>
        this.#update({ status: 'disconnected', error })
      ),
      attach(this.client, 'onLogin', () => this.#rememberLogin()),
      attach(this.client, 'onAutoreconnectIteration', (timeout, promise) =>
        this.#handleRetry(timeout, promise)
      ),
    ]);
  }

  async #login(request: Promise<unknown>): Promise<void> {
    try {
      await request;
    } catch (error) {
      this.#update({ status: liveStatus(this.client), error });
      throw error;
    }
    this.#rememberLogin();
  }

  #rememberLogin(): void {
    if (!this.client.isAuthenticated()) {
      this.#update({ status: liveStatus(this.client) });
      return;
    }
    const token = this.client.getAuthToken() ?? undefined;
    this.#reloginToken = token?.token ?? this.#reloginToken;
    this.#update({
      status: 'authenticated',
      error: undefined,
      user: this.client.getCurrentUserID() ?? undefined,
      token,
    });
  }

  #handleConnect(): void {
    this.#update({
      status: liveStatus(this.client),
      retryIn: undefined,
      error: undefined,
    });
    const token = this.#reloginToken;
    if (token && !this.client.isAuthenticated()) {
      this.#login(this.client.loginToken(token)).catch(ignore);
    }
  }

  #handleRetry(timeout: number, promise?: Promise<unknown>): void {
    if (timeout === RECONNECT_STOPPED) {
      this.#update({ status: 'disconnected', retryIn: undefined });
      return;
    }
    if (timeout > 0) {
      this.#update({ status: 'disconnected', retryIn: timeout });
      return;
    }
    this.#update({ status: 'connecting', retryIn: undefined });
    promise?.catch((error: unknown) =>
      this.#update({ status: liveStatus(this.client), error })
    );
  }

  #update(patch: Partial<SessionState>): void {
    const current = this.getSnapshot();
    const next = { ...current, ...patch };
    const changed = SESSION_KEYS.some(
      (key) => !Object.is(next[key], current[key])
    );
    if (changed) {
      this.setSnapshot(next);
    }
  }
}
