# RaffleBandz Utilities

## Raffle Snapshots
RaffleBandz raffles are completed via the following steps:
* Source & purchasing of NFTs or other assets to be raffled
* Determine the mint size of each raffle and ticket price
* Completion of the raffle ticket artwork per raffle
* Set snapshot & raffle dates
* Snapshots are taken via this tool and the data provided in our Discord server in the #raffles channel
* A random number generator discord bot is used to select a slot from the total # of slots

#### Snapshot generation
To generate a raffle owners snapshot, run the following command:

```sh
> pushd /path/to/raffle-bandz/raffle-snapshots
> ts-node ./scripts/rafflebandz-snapshot-generator.js -v --assetId=798434015

or 

> yarn snapshot -v --assetId=798434015
```

### Snapshot History
See the "snapshots" folder for historical snapshot results. Each snapshot is stored in a dated directory.
* Raffle 1 - 2022-07-10 - RB001 - Asset ID: 798434015
