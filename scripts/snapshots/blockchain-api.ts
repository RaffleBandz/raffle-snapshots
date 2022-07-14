// import nodeFetch from 'node-fetch';

type AxferTx = {
  amount: number;
  receiver: string;
  sender: string;
};

export type AssetInfo = {
  assetId: number;
  createdRound: number;
  deleted: boolean | null; // true or false
  clawback: string | null;
  freeze: string | null;
  creator: string | null;
  manager: string | null;
  reserve: string | null;
  name: string | null;
  unitName: string | null;
  decimals: number;
  supply: number;
  url: string | null;
  accounts: string[];
};

const ZERO_ADDRESS = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ';

// We have to do this because the node-fetch maintainers jumped the gun
// eslint-disable-next-line no-new-func
const importDynamic = new Function('modulePath', 'return import(modulePath)');

const getFetch = async () => {
  // const { default: fetch } = await import('node-fetch');
  // return fetch;
  const module = await importDynamic('node-fetch');
  return module.default; // (...args);
};

const safeParseNum = (num?: string | number | null) => {
  // This encompasses 0, '', null, undefined, NaN
  if (!num) {
    return null;
  }
  const maybe = Number(num);
  if (Number.isNaN(maybe) || !Number.isFinite(maybe)) {
    return null;
  }
  return maybe;
};

export const getAssetInfo = async (assetId: number) => {
  const assetInfo: AssetInfo = {
    assetId,
    createdRound: 0,
    deleted: null, // true or false
    clawback: null,
    freeze: null,
    creator: null,
    manager: null,
    reserve: null,
    name: null,
    unitName: null,
    decimals: 0,
    supply: 0,
    url: null,
    accounts: [],
  };

  try {
    const fetch = await getFetch();

    const url = `https://algoindexer.algoexplorerapi.io/v2/assets/${assetId}`;
    console.log(`\nFetching asset information: ${url}`);
    const response = await fetch(url);
    if (response.ok && response.status === 200) {
      const assetData = await response.json() as any;
      const data = assetData.asset;
      const assetParams = data.params;

      assetInfo.createdRound = data['created-at-round'];
      assetInfo.deleted = data.deleted;
      assetInfo.creator = assetParams.creator;
      assetInfo.clawback = assetParams.clawback === ZERO_ADDRESS ? null : assetParams.clawback;
      assetInfo.freeze = assetParams.freeze === ZERO_ADDRESS ? null : assetParams.freeze;
      assetInfo.manager = assetParams.manager === ZERO_ADDRESS ? null : assetParams.manager;
      assetInfo.reserve = assetParams.reserve === ZERO_ADDRESS ? null : assetParams.reserve;
      assetInfo.name = assetParams.name;
      assetInfo.unitName = assetParams['unit-name'];
      assetInfo.decimals = assetParams.decimals;
      assetInfo.supply = assetParams.total;
      assetInfo.url = assetParams.url;
    } else {
      throw new Error('Invalid server response: status:' + response.status + ', ok:' + response.ok);
    }
  } catch (error) {
    console.error('FATAL ERROR [getAssetInfo]:', error);
    return null;
  }

  const { accounts, ...rest } = assetInfo;
  console.log('Returning asset info:', rest);
  console.log();
  return assetInfo;
};

const isValidAxferTxn = (tx: any, assetId: number) => (
  tx['tx-type'] === 'axfer' && (
    (tx['asset-transfer-transaction'].amount > 0 || tx['asset-transfer-transaction']['close-amount'] > 0)
    && tx['asset-transfer-transaction']['asset-id'] === assetId
  )
);

const appCallIsAxfer = (tx: any, assetId: number) => {
  const innerTxns = tx['inner-txns'];
  return Array.isArray(innerTxns) && innerTxns.find((tx) => isValidAxferTxn(tx, assetId));
};

const getAxferTxnReceiver = (tx: any) => {
  const receiver = tx['asset-transfer-transaction'].receiver;
  if (receiver === ZERO_ADDRESS && tx['asset-transfer-transaction']['close-to'] !== ZERO_ADDRESS) {
    return tx['asset-transfer-transaction']['close-to'];
  }
  return receiver;
};

const getAxferTxnAmount = (tx: any) => (
  tx['asset-transfer-transaction'].amount || tx['asset-transfer-transaction']['close-amount']
);

const getAxferSender = (tx: any) => tx.sender;


const getTxnReceiver = (tx: any, assetId: number) => {
  if (appCallIsAxfer(tx, assetId)) {
    const innerTxns = tx['inner-txns'];
    // TODO: there may be many of these, what would that look like?
    const axferTxn = innerTxns.find((tx: any) => isValidAxferTxn(tx, assetId));
    return axferTxn ? getAxferTxnReceiver(axferTxn) : 'unknown';
  }

  return getAxferTxnReceiver(tx);
};

const getTxnAmount = (tx: any, assetId: number) => {
  if (appCallIsAxfer(tx, assetId)) {
    const innerTxns = tx['inner-txns'];
    // TODO: there may be many of these, what would that look like?
    const axferTxn = innerTxns.find((tx: any) => isValidAxferTxn(tx, assetId));
    return axferTxn ? getAxferTxnAmount(axferTxn) : 0;
  }

  return getAxferTxnAmount(tx);
};

const getTxnSender = (tx: any, assetId: number) => {
  if (appCallIsAxfer(tx, assetId)) {
    const innerTxns = tx['inner-txns'];
    // TODO: there may be many of these, what would that look like?
    const axferTxn = innerTxns.find((tx: any) => isValidAxferTxn(tx, assetId));
    return axferTxn ? getAxferSender(axferTxn) : 'unknown';
  }

  return getAxferSender(tx);
};

/**
 * This unfortunately doesn't work if the holder list is longer that 100 - algoexplorer has a hard limit.
 * So it's here for reference, but we actually have to get all the transactions and process them.
 * @deprecated Do not use this function
 * @param {*} assetInfo info
 * @returns none
 */
export const getHolders = async (assetInfo) => {
  const fetch = await getFetch();
  let nextToken = null;

  try {
    do {
      const nextParam = nextToken ? `&next=${nextToken}` : '';
      const url = `https://indexer.algoexplorerapi.io/stats/v2/accounts/rich-list?limit=50&asset-id=${assetInfo.assetId}${nextParam}`;
      console.log(`Fetching holders: ${url}`);

      const response = await fetch(url);
      if (response.ok && response.status === 200) {
        const data = await response.json() as any;
        nextToken = data['next-token'] ?? null;
        console.log(`Got next token: ${nextToken}`);

        assetInfo.name = data['asset-name'];
        assetInfo.unitName = data['asset-unit-name'];
        assetInfo.decimals = data['asset-decimals'];
        assetInfo.supply = data['asset-total'];
        assetInfo.url = data['asset-url'];

        if (Array.isArray(data.accounts)) {
          console.log(`${data.accounts.length} accounts found`);
          assetInfo.accounts.push(...data.accounts.map((account) => ({
            address: account.address,
            balance: safeParseNum(account.balance),
          })).filter((account) => account.balance > 0));
        } else {
          console.log('wtf', data.accounts);
        }
      } else {
        throw new Error('Invalid server response: status:' + response.status + ', ok:' + response.ok);
      }
    } while (nextToken);
  } catch (error) {
    console.error('FATAL ERROR:', error);
    return null;
  }

  console.log(`Found ${assetInfo.accounts.length} accounts`);
  return assetInfo;
};

/**
 *
 * @param {Number} assetId The ID of the asset to stat history
 * @param {Number} minRound The round to start collecting history
 * @returns {Promise<AxferTx[] | null>}
 */
export const getAssetTransactions = async (assetId: number, minRound: number) => {
  const fetch = await getFetch();
  let nextToken: string | null = null;
  const transactions: AxferTx[] = [];

  try {
    do {
      const nextParam = nextToken ? `&next=${nextToken}` : '';
      const url = `https://algoindexer.algoexplorerapi.io/v2/assets/${assetId}/transactions?min-round=${minRound}${nextParam}`;
      console.log(`Fetching transactions: ${url}`);

      const response = await fetch(url);
      if (response.ok && response.status === 200) {
        const data = await response.json() as any;
        nextToken = data['next-token'] ?? null;
        // console.log(`Got next token: ${nextToken}`);

        if (Array.isArray(data.transactions)) {
          const processed = data.transactions
            .filter((tx) => isValidAxferTxn(tx, assetId) || appCallIsAxfer(tx, assetId))
            .map((tx) => ({
              // Note that we are smashing the meaning of the transactions here - there are several ways to send assets,
              // and several ways to opt out, and we ignore all of them in favor of ONLY seeing where the assets
              // are going. We don't know, at the end of this, who is opted in and who opted out and who sent 100% of their
              // balance but is still opted in - we only know their final balances.
              sender: getTxnSender(tx, assetId),
              receiver: getTxnReceiver(tx, assetId),
              amount: getTxnAmount(tx, assetId),
            }));

          console.log(`${processed.length} transactions added`);
          transactions.push(...processed);
        } else {
          console.log('wtf', data.transactions);
        }
      } else {
        throw new Error('Invalid server response: status:' + response.status + ', ok:' + response.ok);
      }
    } while (nextToken);
  } catch (error) {
    console.error('FATAL ERROR [getAssetTransactions]:', error);
    return null;
  }

  console.log(`Returning ${transactions.length} transactions`);
  console.log();
  return transactions;
};

