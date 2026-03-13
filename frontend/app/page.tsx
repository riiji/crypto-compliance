'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type CompliancePolicy = 'blacklist' | 'whitelist';

interface CompliancePolicyEntry {
  address: string;
  network: string;
}

interface CompliancePolicyMutationHistoryRecord {
  address: string;
  network: string;
  policy: CompliancePolicy;
  action: 'add' | 'remove';
  changed: boolean;
  idempotencyKey: string;
  createdAt: string;
}

interface FormState {
  address: string;
  network: string;
}

interface LoginResponse {
  username: string;
  accessToken: string;
  expiresAt: string;
}

interface AuthSession {
  username: string;
  accessToken: string;
}

class RequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

const DEFAULT_NETWORK = 'eip155:1';
const USERNAME_STORAGE_KEY = 'compliance.console.username';
const TOKEN_STORAGE_KEY = 'compliance.console.jwt';

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  const parsed = text ? (JSON.parse(text) as unknown) : {};
  if (!response.ok) {
    const message =
      typeof parsed === 'object' &&
      parsed !== null &&
      'message' in parsed &&
      typeof parsed.message === 'string'
        ? parsed.message
        : `Request failed with ${response.status}`;
    throw new RequestError(message, response.status);
  }

  return parsed as T;
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function normalizeAddressForComparison(address: string, network: string): string {
  const [namespace] = network.split(':', 2);
  const normalizedAddress = address.trim();
  return namespace === 'eip155'
    ? normalizedAddress.toLowerCase()
    : normalizedAddress;
}

function policyEntryKey(entry: CompliancePolicyEntry): string {
  const network = entry.network.trim();
  const address = normalizeAddressForComparison(entry.address, network);
  return `${network}:${address}`;
}

function readStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const username = window.localStorage.getItem(USERNAME_STORAGE_KEY)?.trim() ?? '';
  const accessToken = window.localStorage.getItem(TOKEN_STORAGE_KEY)?.trim() ?? '';
  if (!username || !accessToken) {
    return null;
  }

  return {
    username,
    accessToken,
  };
}

function persistSession(session: AuthSession): void {
  window.localStorage.setItem(USERNAME_STORAGE_KEY, session.username);
  window.localStorage.setItem(TOKEN_STORAGE_KEY, session.accessToken);
}

function clearStoredSession(): void {
  window.localStorage.removeItem(USERNAME_STORAGE_KEY);
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export default function Home() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [blacklist, setBlacklist] = useState<CompliancePolicyEntry[]>([]);
  const [whitelist, setWhitelist] = useState<CompliancePolicyEntry[]>([]);
  const [history, setHistory] = useState<CompliancePolicyMutationHistoryRecord[]>(
    [],
  );
  const [forms, setForms] = useState<Record<CompliancePolicy, FormState>>({
    blacklist: { address: '', network: DEFAULT_NETWORK },
    whitelist: { address: '', network: DEFAULT_NETWORK },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedSession = readStoredSession();
    setSession(storedSession);
    setLoginUsername(storedSession?.username ?? '');
    setSessionReady(true);
  }, []);

  const handleUnauthorized = useCallback((message: string, username?: string) => {
    clearStoredSession();
    setSession(null);
    setLoginUsername((current) => current || username || '');
    setBlacklist([]);
    setWhitelist([]);
    setHistory([]);
    setIsLoading(false);
    setIsMutating(false);
    setError(message);
  }, []);

  const loadData = useCallback(
    async (activeSession: AuthSession) => {
      setError(null);
      setIsLoading(true);
      try {
        const authorization = `Bearer ${activeSession.accessToken}`;
        const [blacklistData, whitelistData, historyData] = await Promise.all([
          fetch('/api/policies/blacklist', {
            cache: 'no-store',
            headers: {
              authorization,
            },
          }).then((response) => readJson<CompliancePolicyEntry[]>(response)),
          fetch('/api/policies/whitelist', {
            cache: 'no-store',
            headers: {
              authorization,
            },
          }).then((response) => readJson<CompliancePolicyEntry[]>(response)),
          fetch('/api/policies/history?limit=100', {
            cache: 'no-store',
            headers: {
              authorization,
            },
          }).then((response) =>
            readJson<CompliancePolicyMutationHistoryRecord[]>(response),
          ),
        ]);

        setBlacklist(blacklistData);
        setWhitelist(whitelistData);
        setHistory(historyData);
      } catch (loadError) {
        if (loadError instanceof RequestError && loadError.status === 401) {
          handleUnauthorized('Session expired. Sign in again.', activeSession.username);
          return;
        }

        setError(
          loadError instanceof Error ? loadError.message : 'Failed to load data',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [handleUnauthorized],
  );

  useEffect(() => {
    if (!sessionReady) {
      return;
    }

    if (!session) {
      setIsLoading(false);
      return;
    }

    void loadData(session);
  }, [loadData, session, sessionReady]);

  const entriesByPolicy = useMemo(
    () => ({
      blacklist,
      whitelist,
    }),
    [blacklist, whitelist],
  );

  const whitelistEntryKeys = useMemo(
    () => new Set(whitelist.map((entry) => policyEntryKey(entry))),
    [whitelist],
  );

  const setFormField = useCallback(
    (policy: CompliancePolicy, field: keyof FormState, value: string) => {
      setForms((previous) => ({
        ...previous,
        [policy]: {
          ...previous[policy],
          [field]: value,
        },
      }));
    },
    [],
  );

  const mutatePolicy = useCallback(
    async (
      policy: CompliancePolicy,
      action: 'add' | 'remove',
      payload: CompliancePolicyEntry,
      options?: { confirmPolicySwitch?: boolean },
    ): Promise<boolean> => {
      if (!session) {
        setError('Authentication is required');
        return false;
      }

      setError(null);
      setIsMutating(true);
      try {
        const response = await fetch(`/api/policies/${policy}`, {
          method: action === 'add' ? 'POST' : 'DELETE',
          headers: {
            authorization: `Bearer ${session.accessToken}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            address: payload.address.trim(),
            network: payload.network.trim(),
            confirmPolicySwitch: options?.confirmPolicySwitch ?? false,
          }),
        });
        await readJson(response);
        await loadData(session);
        return true;
      } catch (mutationError) {
        if (mutationError instanceof RequestError && mutationError.status === 401) {
          handleUnauthorized('Session expired. Sign in again.', session.username);
          return false;
        }

        setError(
          mutationError instanceof Error
            ? mutationError.message
            : 'Mutation request failed',
        );
        return false;
      } finally {
        setIsMutating(false);
      }
    },
    [handleUnauthorized, loadData, session],
  );

  const handleAdd = useCallback(
    async (policy: CompliancePolicy) => {
      const form = forms[policy];
      if (!form.address.trim() || !form.network.trim()) {
        setError('Address and network are required');
        return;
      }

      const payload: CompliancePolicyEntry = {
        address: form.address.trim(),
        network: form.network.trim(),
      };

      let confirmPolicySwitch = false;
      if (policy === 'blacklist') {
        const key = policyEntryKey(payload);
        if (whitelistEntryKeys.has(key)) {
          const confirmed = window.confirm(
            'This address and network are already in whitelist. Move it to blacklist and remove it from whitelist?',
          );
          if (!confirmed) {
            return;
          }

          confirmPolicySwitch = true;
        }
      }

      const changed = await mutatePolicy(policy, 'add', payload, {
        confirmPolicySwitch,
      });
      if (changed) {
        setForms((previous) => ({
          ...previous,
          [policy]: {
            ...previous[policy],
            address: '',
          },
        }));
      }
    },
    [forms, mutatePolicy, whitelistEntryKeys],
  );

  const handleRemove = useCallback(
    async (policy: CompliancePolicy, entry: CompliancePolicyEntry) => {
      await mutatePolicy(policy, 'remove', entry);
    },
    [mutatePolicy],
  );

  const handleLogin = useCallback(async () => {
    const username = loginUsername.trim();
    if (!username) {
      setError('Username is required');
      return;
    }

    setError(null);
    setIsAuthenticating(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          username,
        }),
      });
      const result = await readJson<LoginResponse>(response);
      const nextSession: AuthSession = {
        username: result.username,
        accessToken: result.accessToken,
      };
      persistSession(nextSession);
      setSession(nextSession);
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : 'Authentication request failed',
      );
    } finally {
      setIsAuthenticating(false);
    }
  }, [loginUsername]);

  const handleLogout = useCallback(() => {
    clearStoredSession();
    setSession(null);
    setBlacklist([]);
    setWhitelist([]);
    setHistory([]);
    setError(null);
    setIsLoading(false);
  }, []);

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-[linear-gradient(160deg,#f4f7ff_0%,#eef8f5_45%,#f8f6ef_100%)] p-4 md:p-8">
        <main className="mx-auto flex min-h-[40vh] w-full max-w-2xl items-center justify-center rounded-3xl border border-slate-200 bg-white/85 p-6 text-sm text-slate-600 shadow-xl shadow-slate-300/30 backdrop-blur">
          Loading session...
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[linear-gradient(160deg,#f4f7ff_0%,#eef8f5_45%,#f8f6ef_100%)] p-4 md:p-8">
        <main className="mx-auto flex w-full max-w-xl flex-col gap-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-300/30 backdrop-blur md:p-8">
          <header className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Admin Access
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Compliance Policy Console
            </h1>
            <p className="text-sm text-slate-600">
              Enter a username to start a local admin session. The username and
              JWT are stored in local storage for this browser.
            </p>
          </header>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <label className="block text-sm font-medium text-slate-700" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              autoComplete="username"
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              onChange={(event) => setLoginUsername(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void handleLogin();
                }
              }}
              placeholder="alice"
              value={loginUsername}
            />
            <button
              className="mt-4 inline-flex min-w-36 items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={isAuthenticating}
              onClick={() => void handleLogin()}
              type="button"
            >
              {isAuthenticating ? 'Starting session...' : 'Continue'}
            </button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,#f4f7ff_0%,#eef8f5_45%,#f8f6ef_100%)] p-4 md:p-8">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-xl shadow-slate-300/30 backdrop-blur md:p-8">
        <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Authenticated Admin Session
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Compliance Policy Console
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Signed in as <span className="font-medium text-slate-900">{session.username}</span>. Manage blacklist and whitelist entries and review mutation history.
            </p>
          </div>
          <button
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
            onClick={handleLogout}
            type="button"
          >
            Sign out
          </button>
        </header>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2">
          {(['blacklist', 'whitelist'] as CompliancePolicy[]).map((policy) => {
            const entries = entriesByPolicy[policy];
            const title = policy === 'blacklist' ? 'Blacklist' : 'Whitelist';
            const accent =
              policy === 'blacklist'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700';

            return (
              <article
                key={policy}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                  <span className={`rounded-full border px-3 py-1 text-xs ${accent}`}>
                    {entries.length} entries
                  </span>
                </div>

                <div className="grid gap-3">
                  <input
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                    onChange={(event) =>
                      setFormField(policy, 'address', event.target.value)
                    }
                    placeholder="Wallet address"
                    value={forms[policy].address}
                  />
                  <input
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                    onChange={(event) =>
                      setFormField(policy, 'network', event.target.value)
                    }
                    placeholder="CAIP-2 network"
                    value={forms[policy].network}
                  />
                  <button
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    disabled={isMutating}
                    onClick={() => void handleAdd(policy)}
                    type="button"
                  >
                    {isMutating ? 'Saving...' : `Add to ${title}`}
                  </button>
                </div>

                <div className="mt-5 space-y-3">
                  {isLoading && entries.length === 0 ? (
                    <p className="text-sm text-slate-500">Loading entries...</p>
                  ) : entries.length === 0 ? (
                    <p className="text-sm text-slate-500">No entries yet.</p>
                  ) : (
                    entries.map((entry) => (
                      <div
                        key={policyEntryKey(entry)}
                        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-mono text-sm text-slate-900">
                            {entry.address}
                          </p>
                          <p className="text-xs text-slate-500">{entry.network}</p>
                        </div>
                        <button
                          className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-400"
                          disabled={isMutating}
                          onClick={() => void handleRemove(policy, entry)}
                          type="button"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </article>
            );
          })}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Mutation History</h2>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
              {history.length} records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Policy</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Address</th>
                  <th className="px-3 py-2">Idempotency</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && history.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-slate-500" colSpan={5}>
                      Loading history...
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-slate-500" colSpan={5}>
                      No mutations recorded yet.
                    </td>
                  </tr>
                ) : (
                  history.map((record) => (
                    <tr
                      key={`${record.createdAt}:${record.idempotencyKey}:${record.policy}:${record.action}:${record.address}`}
                      className="rounded-xl bg-slate-50 text-slate-700"
                    >
                      <td className="rounded-l-xl px-3 py-3 align-top">
                        {formatDateTime(record.createdAt)}
                      </td>
                      <td className="px-3 py-3 align-top capitalize">
                        {record.policy}
                      </td>
                      <td className="px-3 py-3 align-top capitalize">
                        {record.action}
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="font-mono text-xs text-slate-900">
                          {record.address}
                        </div>
                        <div className="text-xs text-slate-500">{record.network}</div>
                      </td>
                      <td className="rounded-r-xl px-3 py-3 align-top">
                        <div className="font-mono text-xs text-slate-900">
                          {record.idempotencyKey || 'n/a'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {record.changed ? 'Applied' : 'No change'}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
