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

const DEFAULT_NETWORK = 'eip155:1';

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
    throw new Error(message);
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

export default function Home() {
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
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const [blacklistData, whitelistData, historyData] = await Promise.all([
        fetch('/api/policies/blacklist', { cache: 'no-store' }).then((response) =>
          readJson<CompliancePolicyEntry[]>(response),
        ),
        fetch('/api/policies/whitelist', { cache: 'no-store' }).then((response) =>
          readJson<CompliancePolicyEntry[]>(response),
        ),
        fetch('/api/policies/history?limit=100', { cache: 'no-store' }).then(
          (response) => readJson<CompliancePolicyMutationHistoryRecord[]>(response),
        ),
      ]);

      setBlacklist(blacklistData);
      setWhitelist(whitelistData);
      setHistory(historyData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

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
    ) => {
      setError(null);
      setIsMutating(true);
      try {
        const response = await fetch(`/api/policies/${policy}`, {
          method: action === 'add' ? 'POST' : 'DELETE',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            address: payload.address.trim(),
            network: payload.network.trim(),
            confirmPolicySwitch: options?.confirmPolicySwitch ?? false,
          }),
        });
        await readJson(response);
        await loadData();
      } catch (mutationError) {
        setError(
          mutationError instanceof Error
            ? mutationError.message
            : 'Mutation request failed',
        );
      } finally {
        setIsMutating(false);
      }
    },
    [loadData],
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

      await mutatePolicy(policy, 'add', payload, { confirmPolicySwitch });
      setForms((previous) => ({
        ...previous,
        [policy]: {
          ...previous[policy],
          address: '',
        },
      }));
    },
    [forms, mutatePolicy, whitelistEntryKeys],
  );

  const handleRemove = useCallback(
    async (policy: CompliancePolicy, entry: CompliancePolicyEntry) => {
      await mutatePolicy(policy, 'remove', entry);
    },
    [mutatePolicy],
  );

  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,#f4f7ff_0%,#eef8f5_45%,#f8f6ef_100%)] p-4 md:p-8">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-xl shadow-slate-300/30 backdrop-blur md:p-8">
        <header className="flex flex-col gap-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Compliance Policy Console
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage blacklist and whitelist entries and review mutation history.
            </p>
          </div>
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

                <div className="grid gap-2 md:grid-cols-[1.4fr_1fr_auto]">
                  <input
                    value={forms[policy].address}
                    onChange={(event) =>
                      setFormField(policy, 'address', event.target.value)
                    }
                    placeholder="Address"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-500 transition focus:ring-2"
                  />
                  <input
                    value={forms[policy].network}
                    onChange={(event) =>
                      setFormField(policy, 'network', event.target.value)
                    }
                    placeholder="Network (e.g. eip155:1)"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-500 transition focus:ring-2"
                  />
                  <button
                    type="button"
                    onClick={() => void handleAdd(policy)}
                    disabled={isMutating || isLoading}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Add
                  </button>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-2 py-2">Address</th>
                        <th className="px-2 py-2">Network</th>
                        <th className="px-2 py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.length === 0 ? (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-2 py-4 text-center text-slate-500"
                          >
                            {isLoading ? 'Loading...' : 'No entries'}
                          </td>
                        </tr>
                      ) : (
                        entries.map((entry) => (
                          <tr key={`${entry.network}:${entry.address}`} className="border-b border-slate-100">
                            <td className="px-2 py-2 font-mono text-xs text-slate-800">
                              {entry.address}
                            </td>
                            <td className="px-2 py-2 text-slate-700">{entry.network}</td>
                            <td className="px-2 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => void handleRemove(policy, entry)}
                                disabled={isMutating || isLoading}
                                className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </article>
            );
          })}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Mutation History</h2>
            <button
              type="button"
              onClick={() => void loadData()}
              disabled={isLoading || isMutating}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">Time</th>
                  <th className="px-2 py-2">Policy</th>
                  <th className="px-2 py-2">Action</th>
                  <th className="px-2 py-2">Address</th>
                  <th className="px-2 py-2">Network</th>
                  <th className="px-2 py-2">Changed</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-2 py-4 text-center text-slate-500">
                      {isLoading ? 'Loading...' : 'No history yet'}
                    </td>
                  </tr>
                ) : (
                  history.map((record) => (
                    <tr
                      key={`${record.idempotencyKey}:${record.createdAt}`}
                      className="border-b border-slate-100"
                    >
                      <td className="px-2 py-2 text-slate-700">
                        {formatDateTime(record.createdAt)}
                      </td>
                      <td className="px-2 py-2 text-slate-700">{record.policy}</td>
                      <td className="px-2 py-2 text-slate-700">{record.action}</td>
                      <td className="px-2 py-2 font-mono text-xs text-slate-800">
                        {record.address}
                      </td>
                      <td className="px-2 py-2 text-slate-700">{record.network}</td>
                      <td className="px-2 py-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            record.changed
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {record.changed ? 'yes' : 'no'}
                        </span>
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
