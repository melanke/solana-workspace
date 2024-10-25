# "G.O.T. Critter"

## What is this?

This is an implementation of a betting game similar to the "Jogo do bicho" game. The main idea here is to create a decentralized game without administrative control with the whole prize distributed among the winners.

This project was generated with [create-solana-dapp](https://github.com/solana-developers/create-solana-dapp).

## Setup

Are you **new to Solana?** Install required softwares following the steps on [Solana Documentation](https://solana.com/pt/developers/guides/getstarted/setup-local-development#2-install-rust). And check the [Other Setup Tips](#other-setup-tips) section.

### 1. Install the dependencies:

```bash
npm i
```

### 2. Build and deploy the program:

On a dedicated terminal, run:

```bash
npm run anchor localnet
```

### 3. Run the client:

On a dedicated terminal, run:

```bash
npm run dev
```

### 4. Run the Game Recycler

On a dedicated terminal, run:

```bash
npm run start-recycler
```

## Code Navigation

- `anchor/programs/gotcritter/src/lib.rs`: The contract code, fully commented.
- `anchor/src/gotcritter-exports.ts`: Methods, variables and types used by the scripts, tests and client.
- `src/components/gotcritter/gotcritter-data-access.ts`: Methods to interact with the contract used by the client.
- `src/components/gotcritter/gotcritter-ui.tsx`: The most relevant client UI.
- `scripts`: The folder with the scripts mentioned above.
- `anchor/tests/gotcritter.spec.ts`: Tests that cover the whole game logic.

## How to play

### 1. Create a new game

You can create a new game by clicking on the "Create Game" button on the client, but if there is no game running, the game-recycler will create one.
On the "Create Game" form, you can choose the "minimum" number of slots that will be used for the betting period.

### 2. Bet on a game

You can bet on a game by clicking on the "Bet" button on the client. You can choose the number of SOL that you want to bet and which number you want to bet on. You can make as many bets as you want, but you can only bet on numbers between 1 and 25.

### 3. Wait for the betting period to end

The betting period will end after the conditions:

- The minimum number of slots has passed;
- The game has received bets on all numbers between 1 and 25;
  - You can run `npm run fill-game` to automatically fill the game with the remaining bets;
- The "Special Block" has been found.
  - The game-recycler will automatically search for the "Special Block". More about it below.

### 4. Check if you win

When the betting period ends, the game has it's final "Drawn Number" calculated.

### 5. Claim your winnings

For each winning bet, you can claim your winnings by clicking on the "Claim Prize" button on the client.

## How it works

> **⚠️ I am not using Switchboard, but I have my reasons:**
> My strategy on the randomization felt secure enough to not use an external actor like Switchboard and, in my perception, Switchboard is a centralized party that requires trust. I will try Switchboard anyways to learn how to use it in the future.

### Special Block

When the **minimum game period** has past and there is at least **one bet for each number**, anyone can end the betting period by finding a **Special Block**.

A **Special Block** is identified by a blockhash where the last two characters are the same. If a bettor attempts to place a bet on a block that follows a Special Block, their bet will be ignored, and the betting period will end. The bettor will receive a small reward for closing the betting period.

### Drawn Number

The number is calculated based on the preceding block of each bet plus the Special Block.

### Is it really safe?

- There will be a queue of bets, it's possible to have only one bet per gamePDA per block, since the gamePDA is a mutable reference on the PlaceBet method.
- No one knows which will be the Special Block before it's too late to bet. So there's no way to predict the Drawn Number.
- Looking for the reward, bots like the game-recycler will close the game on the first chance. So there is no way to skip a Special Block waiting for your Drawn Number.
- Everytime a bet is placed the drawn number would need to be recalculated, making it more difficult to manipulate.
- A Validator could delay the block so it generates a particular blockhash, but this is a difficult process and there is a good chance for him to get caught and punished.
- Someone could Spam the network with a priority fee so the transaction that tries to intentionally close the bet could be delayed and cancelled, but again, the bot could do the same, eventually a delayed bet would land on a Special Block, unintentionally closing the game.
- There are some dependencies on the contract that are marked as deprecated, but I couldn't find a documentation about the new alternatives.

### Private Games

When creating a game the contract accepts a list of participants, when not empty, only those would be able to bet on this game. But this feature is not tested yet.

## Other Setup Tips

<details>
<summary>Install Node</summary>

- Install NVM:
  ```
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  ```
- Install latest nodejs:
  ```
  nvm install --lts
  ```
- Use the nodejs version you just installed:
  ```
  nvm use <version>
  ```
- And finally, you can install dependencies of the repository:
  ```
  npm i
  ```

</details>

<details>
<summary>Problem running solana-test-validator</summary>

If you have a problem with `solana-test-validator` try installing bzip2:

```
sudo apt-get install bzip2
```

</details>

<details>
<summary>Using a real Wallet</summary>

- Install Phantom Wallet as your browser Extension, create an account
- Change Phantom to use local network: Side menu > Config Icon > Developer definitions > Solana > Select "Solana Localnet"
- Add funds to your Phantom: `solana airdrop 100 <address>`
- Check Phantom balance: `solana balance <address>`
</details>

<details>
<summary>Fix Solana version on the project</summary>

Open src/program-rust/Cargo.toml and change `solana-program`, `solana-program-test` and `solana-sdk` to use the same
version of your `solana-cli`, which is probably the latest.

</details>
