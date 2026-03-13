export interface NetworkOption {
  id: string;
  label: string;
  shortLabel: string;
  caip2: string;
  family: string;
  addressPlaceholder: string;
  description: string;
  aliases: readonly string[];
  assets: readonly string[];
  iconBackground: string;
  iconForeground: string;
  iconBorder: string;
}

export const DEFAULT_NETWORK_OPTION_ID = 'ethereum-mainnet';

export const NETWORK_OPTIONS: readonly NetworkOption[] = [
  {
    id: 'ethereum-mainnet',
    label: 'Ethereum Mainnet',
    shortLabel: 'ETH',
    caip2: 'eip155:1',
    family: 'EVM',
    addressPlaceholder: '0x...',
    description: 'Default EVM network for ERC-20 and mainnet wallet checks.',
    aliases: ['ethereum', 'eth', 'erc20', 'mainnet'],
    assets: ['ETH', 'USDT', 'USDC', 'DAI'],
    iconBackground: '#EEF2FF',
    iconForeground: '#4338CA',
    iconBorder: '#C7D2FE',
  },
  {
    id: 'base-mainnet',
    label: 'Base',
    shortLabel: 'BASE',
    caip2: 'eip155:8453',
    family: 'EVM',
    addressPlaceholder: '0x...',
    description: 'EVM network for Base mainnet addresses.',
    aliases: ['base', 'coinbase', 'l2'],
    assets: ['ETH', 'USDC', 'USDT', 'cbBTC'],
    iconBackground: '#DBEAFE',
    iconForeground: '#1D4ED8',
    iconBorder: '#93C5FD',
  },
  {
    id: 'arbitrum-one',
    label: 'Arbitrum One',
    shortLabel: 'ARB',
    caip2: 'eip155:42161',
    family: 'EVM',
    addressPlaceholder: '0x...',
    description: 'EVM network for Arbitrum One.',
    aliases: ['arbitrum', 'arb', 'one', 'l2'],
    assets: ['ETH', 'USDT', 'USDC', 'ARB'],
    iconBackground: '#E0F2FE',
    iconForeground: '#0369A1',
    iconBorder: '#7DD3FC',
  },
  {
    id: 'optimism-mainnet',
    label: 'Optimism',
    shortLabel: 'OP',
    caip2: 'eip155:10',
    family: 'EVM',
    addressPlaceholder: '0x...',
    description: 'EVM network for Optimism mainnet.',
    aliases: ['optimism', 'op', 'l2'],
    assets: ['ETH', 'USDT', 'USDC', 'OP'],
    iconBackground: '#FEE2E2',
    iconForeground: '#B91C1C',
    iconBorder: '#FCA5A5',
  },
  {
    id: 'polygon-pos',
    label: 'Polygon PoS',
    shortLabel: 'POL',
    caip2: 'eip155:137',
    family: 'EVM',
    addressPlaceholder: '0x...',
    description: 'EVM network for Polygon mainnet.',
    aliases: ['polygon', 'matic', 'pol', 'pos'],
    assets: ['POL', 'USDT', 'USDC', 'DAI'],
    iconBackground: '#F3E8FF',
    iconForeground: '#7E22CE',
    iconBorder: '#D8B4FE',
  },
  {
    id: 'bnb-smart-chain',
    label: 'BNB Smart Chain',
    shortLabel: 'BNB',
    caip2: 'eip155:56',
    family: 'EVM',
    addressPlaceholder: '0x...',
    description: 'EVM network for BNB Smart Chain mainnet.',
    aliases: ['bnb', 'bsc', 'bep20', 'binance'],
    assets: ['BNB', 'USDT', 'USDC', 'FDUSD'],
    iconBackground: '#FEF3C7',
    iconForeground: '#A16207',
    iconBorder: '#FCD34D',
  },
  {
    id: 'avalanche-c-chain',
    label: 'Avalanche C-Chain',
    shortLabel: 'AVAX',
    caip2: 'eip155:43114',
    family: 'EVM',
    addressPlaceholder: '0x...',
    description: 'EVM network for Avalanche C-Chain.',
    aliases: ['avalanche', 'avax', 'c-chain'],
    assets: ['AVAX', 'USDT', 'USDC', 'BTC.b'],
    iconBackground: '#FEE2E2',
    iconForeground: '#BE123C',
    iconBorder: '#FDA4AF',
  },
  {
    id: 'tron-mainnet',
    label: 'Tron',
    shortLabel: 'TRX',
    caip2: 'tron:0x2b6653dc',
    family: 'TRON',
    addressPlaceholder: 'T... or 41...',
    description: 'Tron mainnet for TRX and TRC-20 wallet checks.',
    aliases: ['tron', 'trx', 'trc20', 'trc-20'],
    assets: ['TRX', 'USDT', 'USDC', 'USDD'],
    iconBackground: '#FEE2E2',
    iconForeground: '#DC2626',
    iconBorder: '#FCA5A5',
  },
  {
    id: 'bitcoin-mainnet',
    label: 'Bitcoin',
    shortLabel: 'BTC',
    caip2: 'bip122:000000000019d6689c085ae165831e93',
    family: 'UTXO',
    addressPlaceholder: 'bc1... or 1... or 3...',
    description: 'Bitcoin mainnet using the CAIP-2 bip122 namespace.',
    aliases: ['bitcoin', 'btc', 'segwit', 'taproot'],
    assets: ['BTC', 'WBTC'],
    iconBackground: '#FFEDD5',
    iconForeground: '#C2410C',
    iconBorder: '#FDBA74',
  },
] as const;

export const DEFAULT_NETWORK_CAIP2 =
  NETWORK_OPTIONS.find((option) => option.id === DEFAULT_NETWORK_OPTION_ID)?.caip2 ??
  'eip155:1';

const networkOptionsById = new Map(
  NETWORK_OPTIONS.map((option) => [option.id, option] as const),
);

const networkOptionsByCaip2 = new Map(
  NETWORK_OPTIONS.map((option) => [option.caip2, option] as const),
);

export function getNetworkOptionById(id: string): NetworkOption | undefined {
  return networkOptionsById.get(id);
}

export function getNetworkOptionByCaip2(
  caip2: string,
): NetworkOption | undefined {
  return networkOptionsByCaip2.get(caip2.trim());
}

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase();
}

function scoreNetworkOption(option: NetworkOption, query: string): number | null {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) {
    return 0;
  }

  const searchTerms = [
    option.label,
    option.shortLabel,
    option.caip2,
    option.family,
    ...option.aliases,
    ...option.assets,
  ].map(normalizeSearchValue);

  let bestScore: number | null = null;
  for (const term of searchTerms) {
    if (term === normalizedQuery) {
      return 0;
    }

    if (term.startsWith(normalizedQuery)) {
      bestScore = bestScore === null ? 1 : Math.min(bestScore, 1);
      continue;
    }

    if (term.includes(normalizedQuery)) {
      bestScore = bestScore === null ? 2 : Math.min(bestScore, 2);
    }
  }

  return bestScore;
}

export function searchNetworkOptions(query: string): NetworkOption[] {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) {
    return [...NETWORK_OPTIONS];
  }

  return [...NETWORK_OPTIONS]
    .map((option) => ({
      option,
      score: scoreNetworkOption(option, normalizedQuery),
    }))
    .filter(
      (result): result is { option: NetworkOption; score: number } =>
        result.score !== null,
    )
    .sort((left, right) => {
      if (left.score !== right.score) {
        return left.score - right.score;
      }

      return left.option.label.localeCompare(right.option.label);
    })
    .map((result) => result.option);
}
