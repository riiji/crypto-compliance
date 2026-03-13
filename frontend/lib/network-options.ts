export interface NetworkOption {
  id: string;
  label: string;
  caip2: string;
  addressPlaceholder: string;
  description: string;
}

export const CUSTOM_NETWORK_OPTION_ID = 'custom';
export const DEFAULT_NETWORK_OPTION_ID = 'ethereum-mainnet';

export const NETWORK_OPTIONS: readonly NetworkOption[] = [
  {
    id: 'ethereum-mainnet',
    label: 'Ethereum Mainnet',
    caip2: 'eip155:1',
    addressPlaceholder: '0x...',
    description: 'Default EVM network for ERC-20 and mainnet wallet checks.',
  },
  {
    id: 'base-mainnet',
    label: 'Base',
    caip2: 'eip155:8453',
    addressPlaceholder: '0x...',
    description: 'EVM network for Base mainnet addresses.',
  },
  {
    id: 'arbitrum-one',
    label: 'Arbitrum One',
    caip2: 'eip155:42161',
    addressPlaceholder: '0x...',
    description: 'EVM network for Arbitrum One.',
  },
  {
    id: 'optimism-mainnet',
    label: 'Optimism',
    caip2: 'eip155:10',
    addressPlaceholder: '0x...',
    description: 'EVM network for Optimism mainnet.',
  },
  {
    id: 'polygon-pos',
    label: 'Polygon PoS',
    caip2: 'eip155:137',
    addressPlaceholder: '0x...',
    description: 'EVM network for Polygon mainnet.',
  },
  {
    id: 'bnb-smart-chain',
    label: 'BNB Smart Chain',
    caip2: 'eip155:56',
    addressPlaceholder: '0x...',
    description: 'EVM network for BNB Smart Chain mainnet.',
  },
  {
    id: 'avalanche-c-chain',
    label: 'Avalanche C-Chain',
    caip2: 'eip155:43114',
    addressPlaceholder: '0x...',
    description: 'EVM network for Avalanche C-Chain.',
  },
  {
    id: 'bitcoin-mainnet',
    label: 'Bitcoin',
    caip2: 'bip122:000000000019d6689c085ae165831e93',
    addressPlaceholder: 'bc1... or 1... or 3...',
    description: 'Bitcoin mainnet using the CAIP-2 bip122 namespace.',
  },
] as const;

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
