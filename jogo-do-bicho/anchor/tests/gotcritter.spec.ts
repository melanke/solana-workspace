import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Gotcritter } from "../target/types/gotcritter";
import { jest, expect, describe, it } from "@jest/globals";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

jest.setTimeout(70 * 1000);

describe("gotcritter", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Gotcritter as Program<Gotcritter>;
  const provider = anchor.getProvider();

  it(
    "Deve permitir fazer uma aposta",
    async () => {
      const gameKeypair = anchor.web3.Keypair.generate();

      // Criar o jogo
      await program.methods
        .createGame(true, null)
        .accounts({
          game: gameKeypair.publicKey,
          creator: provider.publicKey,
        })
        .signers([gameKeypair])
        .rpc();

      const bettor = provider;

      // Financiar a conta do apostador
      const airDropSignature = await provider.connection.requestAirdrop(
        bettor.publicKey!,
        2000 * anchor.web3.LAMPORTS_PER_SOL
      );

      // Aguardar a confirmação do airdrop
      let latestBlockhash = await provider.connection.getLatestBlockhash();
      await provider.connection.confirmTransaction(
        { signature: airDropSignature, ...latestBlockhash },
        "confirmed"
      );

      const bets: anchor.web3.PublicKey[] = [];
      for (let i = 0; i < 25; i++) {
        // Fazer a aposta
        const betNumber = i + 1;
        const betValue = new anchor.BN(LAMPORTS_PER_SOL); // 1 SOL

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

        const eventParser = new anchor.EventParser(
          program.programId,
          new anchor.BorshCoder(program.idl)
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
          betValue.mul(new anchor.BN(i + 1)).toNumber()
        );
      }

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
      expect(Number(prize)).toBe(25 * LAMPORTS_PER_SOL);

      const bettorBalanceBeforeClaim = (
        await provider.connection.getAccountInfo(bettor.publicKey!)
      )?.lamports;

      // THE FOLLOWING TESTS WILL FAIL IF THE GAME IS NOT FINISHED, SO YOU SHOULD COMMENT THE VALIDATION ON THE CONTRACT

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
        25 * LAMPORTS_PER_SOL
      );

      const bettorBalanceAfterClaim = (
        await provider.connection.getAccountInfo(bettor.publicKey!)
      )?.lamports;

      expect(bettorBalanceAfterClaim).toBeGreaterThan(
        (bettorBalanceBeforeClaim ?? 0) + 24 * LAMPORTS_PER_SOL
      );
    },
    15 * 1000
  );
});
