import {
  AnchorProvider,
  BN,
  BorshCoder,
  EventParser,
  getProvider,
  Program,
  setProvider,
  web3,
  workspace,
} from "@coral-xyz/anchor";
import { Gotcritter } from "../target/types/gotcritter";
import { jest, expect, describe, it } from "@jest/globals";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { closeGame } from "@project/anchor";

jest.setTimeout(70 * 1000);

// PS.: I am not using anchor-bankrun because it doesn't have functions to get events from the program

describe("gotcritter", () => {
  setProvider(AnchorProvider.env());

  const program = workspace.Gotcritter as Program<Gotcritter>;
  const provider = getProvider();

  it(
    "Deve permitir fazer uma aposta",
    async () => {
      const gameKeypair = web3.Keypair.generate();

      // Create the game
      await program.methods
        .createGame(new BN(1), null)
        .accounts({
          game: gameKeypair.publicKey, // we dont have a constraint over the seed, so we need to create and reference a keypair for each game, which is not a problem
          creator: provider.publicKey,
        })
        .signers([gameKeypair])
        .rpc();

      const bettor = provider;

      // Fund the bettor account
      const airDropSignature = await provider.connection.requestAirdrop(
        bettor.publicKey!,
        2000 * web3.LAMPORTS_PER_SOL
      );

      // Wait for the airdrop confirmation
      let latestBlockhash = await provider.connection.getLatestBlockhash();
      await provider.connection.confirmTransaction(
        { signature: airDropSignature, ...latestBlockhash },
        "confirmed"
      );

      const bets: web3.PublicKey[] = [];
      for (let i = 0; i < 25; i++) {
        // Make the bet
        const betNumber = i + 1;
        const betValue = new BN(LAMPORTS_PER_SOL); // 1 SOL

        const betSignature = await program.methods
          .placeBet(betNumber, betValue)
          .accounts({
            game: gameKeypair.publicKey,
            bettor: bettor.publicKey,
          })
          .rpc();

        latestBlockhash = await provider.connection.getLatestBlockhash();
        await provider.connection.confirmTransaction(
          { signature: betSignature, ...latestBlockhash },
          "confirmed"
        );
        const betTransaction = await provider.connection.getTransaction(
          betSignature,
          {
            commitment: "confirmed",
            maxSupportedTransactionVersion: 0,
          }
        );
        expect(betTransaction).toBeDefined();

        const eventParser = new EventParser(
          program.programId,
          new BorshCoder(program.idl)
        );

        const events = [
          ...eventParser.parseLogs(betTransaction?.meta?.logMessages ?? []),
        ];
        const betPlacedEvent = events.find(
          (event) => event.name === "betPlaced"
        );
        const betPDA = betPlacedEvent?.data.bet;
        bets.push(betPDA);

        const gameAccount = await program.account.game.fetch(
          gameKeypair.publicKey
        );
        expect(gameAccount.betsPerNumber[betNumber - 1].toNumber()).toBe(
          betValue.toNumber()
        );
        expect(gameAccount.totalValue.toNumber()).toBe(
          betValue.mul(new BN(i + 1)).toNumber()
        );
      }

      await closeGame(
        provider as AnchorProvider,
        gameKeypair.publicKey,
        1,
        true
      );

      const drawnNumber = await program.methods
        .drawnNumber()
        .accounts({
          game: gameKeypair.publicKey,
        })
        .view();

      expect(typeof drawnNumber).toBe("number");

      const winningBet = bets[drawnNumber - 1];

      const prize = await program.methods
        .prize()
        .accounts({
          game: gameKeypair.publicKey,
          bet: winningBet,
        })
        .view();
      expect(Number(prize)).toBe((25 - 0.01) * LAMPORTS_PER_SOL); // 0.01 SOL is the reward for the closer

      const bettorBalanceBeforeClaim = (
        await provider.connection.getAccountInfo(bettor.publicKey!)
      )?.lamports;

      await program.methods
        .claimPrize()
        .accounts({
          bet: winningBet,
          game: gameKeypair.publicKey,
          bettor: bettor.publicKey,
        })
        .rpc();

      const updatedGameAccount = await program.account.game.fetch(
        gameKeypair.publicKey
      );
      expect(updatedGameAccount.valueProvidedToWinners.toNumber()).toBe(
        (25 - 0.01) * LAMPORTS_PER_SOL
      ); // 0.01 SOL is the reward for the closer

      const bettorBalanceAfterClaim = (
        await provider.connection.getAccountInfo(bettor.publicKey!)
      )?.lamports;

      expect(bettorBalanceAfterClaim).toBeGreaterThan(
        (bettorBalanceBeforeClaim ?? 0) + 24 * LAMPORTS_PER_SOL
      );
    },
    70 * 1000
  );
});
