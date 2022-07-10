import fs from 'fs';
import path from 'path';

import { format } from 'date-fns';

import { getAssetInfo, getAssetTransactions } from './blockchain-api';


const BANDZ_CREATOR_ADDRESS = '7JKOXWOLN4RYBKVVGX6SSMRIQZJZDVCGOTI4LCPPCE2G44DXXXQ4HZM5YM';

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
 * @param {string} filename The file to write
 * @param {(string | number)[][]} csvData The data to write. Each row should be an array of entries of type string or number
 * @returns The full path to the file that was written
 */
const writeCsvData = (filename: string, csvData: (string | number)[][]) => {
  const snapshotDir = path.resolve(__dirname, '..', '..', 'archive', 'snapshots', format(new Date(), 'yyyy-MM-dd'));
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
export const processAssetHistory = async (assetId) => {
  const assetInfo = await getAssetInfo(assetId);
  if (!assetInfo) { return null; }

  const transactions = await getAssetTransactions(assetId, assetInfo.createdRound - 1);
  if (!transactions) { return null; }

  const holders = { [BANDZ_CREATOR_ADDRESS]: assetInfo.supply };
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
      throw new Error(`Address ${address} was incorrectly processed. Balance: ${holders[address]}`);
    }

    // Filter out our bandz wallet
    if (address === BANDZ_CREATOR_ADDRESS && holders[address] > 0) {
      console.warn('>>>>>>>>>>>>>> THE BANDZ WALLET IS NOT EMPTY. Current balance:', holders[address]);
    }

    if (holders[address] == 0) {
      console.log(`Removing holder with zero balance: ${address}`);
      delete holders[address];
    }
  }

  console.log(`Returning ${Object.keys(holders).length} holders`);
  return holders;
};

const writeSnapshot = (holders: Array<{ address: string; balance: number; }>, snapshotId: string) => {
  const snapshotFilename = `rafflebandz-snapshot-${snapshotId}.csv`;

  // Reshape this array for writing to csv. Create "balance" number of rows for each wallet.
  const csvData: (string | number)[][] = [['Wallet', 'Balance']];
  csvData.push(...holders.map((item) => ([item.address, item.balance])));
  console.log('Writing holders to CSV:', csvData);
  const snapshotPath = writeCsvData(snapshotFilename, csvData);
  console.log(`Snapshot data written to path: ${snapshotPath}`);
};

const writeSnapshotSlots = (holders: Array<{ address: string; balance: number; }>, snapshotId: string) => {
  const slotsFilename = `rafflebandz-slots-${snapshotId}.csv`;

  let slot = 1;
  const csvData: (string | number)[][] = [];
  for (const holder of holders) {
    const holderRows = Array(holder.balance).fill([holder.address, holder.balance, slot]).map((item, i) => ([item[0], item[1], item[2] + i]));
    csvData.push(...holderRows);
    slot += holder.balance;
  }
  const slotPath = writeCsvData(slotsFilename, [['Wallet', 'Tickets Held', 'Slot'], ...csvData]);
  console.log(`Slot data written to path: ${slotPath}`);
};

const writeRandomizeSlots = (holders: Array<{ address: string; balance: number; }>, snapshotId: string) => {
  const slotsShuffledFilename = `rafflebandz-slots-randomized-${snapshotId}.csv`;

  const csvData: (string | number)[][] = [];
  for (const holder of holders) {
    const holderRows = Array(holder.balance).fill([holder.address, holder.balance, 0]).map((x) => [...x]); // make copies!
    csvData.push(...holderRows);
  }
  fisherYatesShuffle(csvData);
  csvData.forEach((item, idx) => { item[2] = idx + 1; });
  const randomSlotsPath = writeCsvData(slotsShuffledFilename, [['Wallet', 'Tickets Held', 'Slot'], ...csvData]);
  console.log(`Randomized slot data written to path: ${randomSlotsPath}`);
};

/**
 * Writes the holder info to the given CSV file. The file will be written in the cwd next to the script file.
 * @param {{[address]: number}} holders The holders list
 * @returns {boolean} True if successful, false otherwise
 */
export const processCsv = async (holders: Record<string, number>) => {
  console.log();
  const snapshotId = format(new Date(), 'yyyy-MM-dd');

  // First reshape the holders object to an array, and sort largest to smallest,
  // For convenience when converting to CSV
  const holdersArray = Object.keys(holders)
    .map((address) => ({ address, balance: holders[address] }))
    .sort((l, r) => r.balance - l.balance);

  // Write each of the snapshot outputs to disk
  writeSnapshot(holdersArray, snapshotId);
  writeSnapshotSlots(holdersArray, snapshotId);
  writeRandomizeSlots(holdersArray, snapshotId);

  return true;
};

module.exports = {
  processAssetHistory,
  processCsv,
};
