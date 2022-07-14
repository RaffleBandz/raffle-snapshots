#!/usr/bin/env ts-node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import {
  processAssetHistory,
  processHolderTotals,
  processCsv,
} from './snapshot-utils';

const cliArgs = yargs(hideBin(process.argv))
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Run with verbose logging',
  })
  .option('assetId', {
    type: 'number',
    description: 'The asset ID to process',
  })
  .option('force', {
    type: 'boolean',
    description: 'Allows the creator wallet to still hold tickets',
  })
  .parse() as any;

// const cliArgs = yargs(hideBin(process.argv)).argv;
const args = {
  verbose: cliArgs.v,
  assetId: cliArgs.assetId,
  force: cliArgs.force,
};

args.verbose && console.log('Snapshot run beginning:', args, processHolderTotals);

if (Array.isArray(args.assetId)) {
  processHolderTotals(args.assetId, args.force)
    .then((results) => {
      args.verbose && console.log('Run complete', !!results);
    });
} else {
  processAssetHistory(args.assetId, args.force)
    .then((holders) => {
      if (!holders) { return null; }
      return processCsv(args.assetId, holders);
    }).then((results) => {
      args.verbose && console.log('Run complete', !!results);
    });
}

