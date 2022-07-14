import fs from 'fs';
import path from 'path';

import { format } from 'date-fns';

import { AssetInfo, getAssetInfo, getAssetTransactions } from './blockchain-api';


const BANDZ_CREATOR_ADDRESS = '7JKOXWOLN4RYBKVVGX6SSMRIQZJZDVCGOTI4LCPPCE2G44DXXXQ4HZM5YM';
const RAFFLE_ADDRESSES = [
  // https://algogems.io/nft/806085485/sale/807650149
  'NH3NJYG2NRIXTVCYB2HGBBJT5R3QG5ZMV6EHEZPGEDWW2PKBFQ5ZY7FIGI',
  // 'I3JRRW5BCUY3XIKJT3GIJRVT5BSUJEDSUGJA267WZAWP4CWCSMYS6RK3CU', // old algoxnft shuffle
  // 'JPAEQLYCN3VOK4LBPUYJJUYXFL6Q63O7RRUZZXKWBEWK7SVY3QEWABEJRQ', // old algoxnft shuffle
  '',
];

// Using Math.random is good enough for this purpose
const fisherYatesShuffle = <T = any>(array: T[], rng: any = Math) => {
  let i = array.length;
  let j = 0;
  let swap: any = null;

  while (--i) {
    j = rng.random() * (i + 1) | 0;
    swap = array[i];
    array[i] = array[j];
    array[j] = swap;
  }
  return array;
};

/**
 * Write a csv data array to disk
 * @param {number} assetId The assetId being processed
 * @param {string} filename The file to write
 * @param {(string | number)[][]} csvData The data to write. Each row should be an array of entries of type string or number
 * @returns The full path to the file that was written
 */
const writeCsvData = (assetId: string | number, filename: string, csvData: (string | number)[][]) => {
  const snapshotDir = path.resolve(__dirname, '..', '..', 'archive', 'snapshots', `${assetId}`, format(new Date(), 'yyyy-MM-dd'));
  fs.mkdirSync(snapshotDir, { recursive: true });

  const localFilepath = path.join(snapshotDir, filename);
  const csvStr = csvData.map((row) => {
    row.forEach((value, idx) => { if (`${value}`.indexOf(',') >= 0) { row[idx] = `"${value}"`; } });
    return row.join(',');
  }).join(`\n`);
  // console.log('Would write csv str:');
  // console.log(csvStr);
  fs.writeFileSync(localFilepath, csvStr);
  return localFilepath;
};

/**
 * Get the holders from an asset's history on the blockchain
 * @param {Number} assetId The asset to process
 * @returns {Promise<{[address]: number} | null>} An object whose keys are the holder addresses and values are their balance.
 */
export const processAssetHistory = async (assetId: number, force: boolean = false) => {
  const assetInfo = await getAssetInfo(assetId);
  if (!assetInfo) { return null; }

  const transactions = await getAssetTransactions(assetId, assetInfo.createdRound - 1);
  if (!transactions) { return null; }

  const holders: Record<string, number> = { [BANDZ_CREATOR_ADDRESS]: assetInfo.supply };
  for (const tx of transactions) {
    // Ensure/initialize the sender & receiver balances
    holders[tx.sender] = holders[tx.sender] ?? 0;
    holders[tx.receiver] = holders[tx.receiver] ?? 0;
    // Move the asset balance
    holders[tx.sender] -= tx.amount;
    holders[tx.receiver] += tx.amount;
  }

  // Filter out holders with 0 balances
  for (const address of Object.keys(holders)) {
    if (holders[address] < 0) {
      if (!force) {
        throw new Error(`Address ${address} was incorrectly processed. ${assetId} Balance: ${holders[address]}`);
      }
      console.log(`Address ${address} was incorrectly processed. ${assetId} Balance: ${holders[address]}`);
      console.log(`${assetId}: Removing holder with invalid balance: ${address}`);
      delete holders[address];
    }

    // Filter out our bandz wallet
    if (address === BANDZ_CREATOR_ADDRESS) {
      if (holders[address] > 0) {
        console.warn(`>>>>>>>>>>>>>> Asset: ${assetId} THE BANDZ WALLET IS NOT EMPTY. Current balance: ${holders[address]}`);
      }
      delete holders[address];
    }

    if (holders[address] == 0) {
      console.log(`${assetId}: Removing holder with zero balance: ${address}`);
      delete holders[address];
    }

    if (RAFFLE_ADDRESSES.includes(address)) {
      console.log(`${assetId}: Removing raffle contract holder: ${address}`);
      delete holders[address];
    }
  }

  console.log(`${assetId}: Returning ${Object.keys(holders).length} holders`);
  return { assetInfo, holders };
};

export const processHolderTotals = async (assetIds: number[], force: boolean = false) => {
  const isValid = (x: any): x is { assetInfo: AssetInfo; holders: Record<string, number>; } => !!x;
  const holderResults = (await Promise.all(assetIds.map((assetId) => processAssetHistory(assetId, force)))).filter(isValid);

  const allAssetInfo = holderResults.map((r) => r.assetInfo).reduce<Record<string, AssetInfo>>((acc, curr) => {
    acc[curr.name!] = curr;
    return acc;
  }, {});

  const allHolders: Record<string, {
    assets: {
      [key: string]: {
        assetInfo: AssetInfo;
        balance: number;
      };
    };
    total: number;
  }> = {};

  for (const holders of holderResults) {
    for (const address of Object.keys(holders.holders)) {
      allHolders[address] = allHolders[address] ?? {
        assets: {
          ...(Object.keys(allAssetInfo).reduce((acc, id) => {
            acc[allAssetInfo[id].unitName!] = { assetInfo: allAssetInfo[id], balance: 0 };
            return acc;
          }, {})),
        },
        total: 0,
      };

      // allHolders[address].assets[holders.assetInfo.assetId] = allHolders[address].assets[holders.assetInfo.assetId] || {
      //   assetInfo: holders.assetInfo,
      //   balance: 0,
      // };
      // allHolders[address].assets[holders.assetInfo.assetId].assetInfo = holders.assetInfo;
      allHolders[address].assets[holders.assetInfo.unitName!].balance += holders.holders[address];
      allHolders[address].total += holders.holders[address];
      // allHolders[address].balance += holders[address];
    }
  }

  const holdersArray = Object.keys(allHolders)
    .map((address) => ({
      address,
      total: allHolders[address].total,
      ...(
        Object.keys(allHolders[address].assets).reduce((acc, curr) => {
          if (allHolders[address].assets[curr].assetInfo) {
            acc[allHolders[address].assets[curr].assetInfo.unitName!] = allHolders[address].assets[curr].balance;
          } else {
            acc[curr] = allHolders[address].assets[curr].balance;
          }
          return acc;
        }, {})
      ),
    }))
    .sort((l, r) => r.total - l.total);
  // console.log(holdersArray);

  const csvData: (string | number)[][] = [['Wallet', ...(Object.keys(allAssetInfo).map((x) => `${allAssetInfo[x].unitName}`)), 'Total Held']];
  csvData.push(...holdersArray.map((item) => {
    const { address, total, ...rest } = item;
    const values = Object.keys(rest).map((key) => rest[key]);
    return [item.address, ...values, item.total];
  }));

  const snapshotId = format(new Date(), 'yyyy-MM-dd');
  const snapshotFilename = `rafflebandz-holders-${snapshotId}.csv`;
  const snapshotPath = writeCsvData('holders', snapshotFilename, csvData);
  console.log(`Holders snapshot data written to path: ${snapshotPath}`);

  return csvData;
};

const writeSnapshot = (assetId: number, holders: Array<{ address: string; balance: number; }>, snapshotId: string) => {
  const snapshotFilename = `rafflebandz-snapshot-${snapshotId}.csv`;

  // Reshape this array for writing to csv. Create "balance" number of rows for each wallet.
  const csvData: (string | number)[][] = [['Wallet', 'Balance']];
  csvData.push(...holders.map((item) => ([item.address, item.balance])));
  console.log('Writing holders to CSV:', csvData);
  const snapshotPath = writeCsvData(assetId, snapshotFilename, csvData);
  console.log(`Snapshot data written to path: ${snapshotPath}`);
};

const writeSnapshotSlots = (assetId: number, holders: Array<{ address: string; balance: number; }>, snapshotId: string) => {
  const slotsFilename = `rafflebandz-slots-${snapshotId}.csv`;

  let slot = 1;
  const csvData: (string | number)[][] = [];
  for (const holder of holders) {
    const holderRows = Array(holder.balance).fill([holder.address, holder.balance, slot]).map((item, i) => ([item[0], item[1], item[2] + i]));
    csvData.push(...holderRows);
    slot += holder.balance;
  }
  const slotPath = writeCsvData(assetId, slotsFilename, [['Wallet', 'Tickets Held', 'Slot'], ...csvData]);
  console.log(`Slot data written to path: ${slotPath}`);
};

const writeRandomizeSlots = (assetId: number, holders: Array<{ address: string; balance: number; }>, snapshotId: string) => {
  const slotsShuffledFilename = `rafflebandz-slots-randomized-${snapshotId}.csv`;

  const csvData: (string | number)[][] = [];
  for (const holder of holders) {
    const holderRows = Array(holder.balance).fill([holder.address, holder.balance, 0]).map((x) => [...x]); // make copies!
    csvData.push(...holderRows);
  }
  fisherYatesShuffle(csvData);
  csvData.forEach((item, idx) => { item[2] = idx + 1; });
  const randomSlotsPath = writeCsvData(assetId, slotsShuffledFilename, [['Wallet', 'Tickets Held', 'Slot'], ...csvData]);
  console.log(`Randomized slot data written to path: ${randomSlotsPath}`);
};

/**
 * Writes the holder info to the given CSV file. The file will be written in the cwd next to the script file.
 * @param {{[address]: number}} holders The holders list
 * @returns {boolean} True if successful, false otherwise
 */
export const processCsv = async (assetId: number, holders: { assetInfo: AssetInfo; holders: Record<string, number>; }) => {
  console.log();
  const snapshotId = format(new Date(), 'yyyy-MM-dd');

  // First reshape the holders object to an array, and sort largest to smallest,
  // For convenience when converting to CSV
  const holdersArray = Object.keys(holders.holders)
    .map((address) => ({ address, balance: holders.holders[address] }))
    .sort((l, r) => r.balance - l.balance);

  // Write each of the snapshot outputs to disk
  writeSnapshot(assetId, holdersArray, snapshotId);
  writeSnapshotSlots(assetId, holdersArray, snapshotId);
  writeRandomizeSlots(assetId, holdersArray, snapshotId);

  return true;
};

// module.exports = {
//   processAssetHistory,
//   processHolderTotals,
//   processCsv,
// };
