#!/usr/bin/env ts-node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import {
  processAssetHistory,
  processCsv,
} from './shapshot-utils';

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
  .parse() as any;

// const cliArgs = yargs(hideBin(process.argv)).argv;
const args = {
  verbose: cliArgs.v,
  assetId: cliArgs.assetId,
};

args.verbose && console.log('Snapshot run beginning:', args);
processAssetHistory(args.assetId)
  .then((holders) => {
    if (!holders) { return null; }
    return processCsv(holders);
  }).then((results) => {
    args.verbose && console.log('Run complete', !!results);
  });
