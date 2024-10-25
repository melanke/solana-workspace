# "G.O.T. Critter"

## What is this?

This is an implementation of a betting game similar to the "Jogo do bicho" game. The main idea here is to create a decentralized game that is not controlled by a single party and the whole prize is distributed among the winners.

## Setup

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
