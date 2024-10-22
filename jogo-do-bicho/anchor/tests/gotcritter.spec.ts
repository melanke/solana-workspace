import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Gotcritter } from "../target/types/gotcritter";
import { jest, expect, describe, it } from "@jest/globals";

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

      const bettor = anchor.web3.Keypair.generate();

      // Financiar a conta do apostador
      const airDropSignature = await provider.connection.requestAirdrop(
        bettor.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );

      // Aguardar a confirmação do airdrop
      let latestBlockhash = await provider.connection.getLatestBlockhash();
      await provider.connection.confirmTransaction(
        { signature: airDropSignature, ...latestBlockhash },
        "confirmed"
      );

      // Fazer a aposta
      const betNumber = 5;
      const betValue = new anchor.BN(1_000_000); // 0.001 SOL

      const betSignature = await program.methods
        .placeBet(betNumber, betValue)
        .accounts({
          game: gameKeypair.publicKey,
          bettor: bettor.publicKey,
        })
        .signers([bettor])
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
      const betPlacedEvent = events.find((event) => event.name === "betPlaced");
      const betPDA = betPlacedEvent?.data.bet;

      const gameAccount = await program.account.game.fetch(
        gameKeypair.publicKey
      );
      expect(gameAccount.totalValue.toNumber()).toBe(betValue.toNumber());
      expect(gameAccount.betsPerNumber[betNumber - 1].toNumber()).toBe(
        betValue.toNumber()
      );

      const drawnNumber = await program.methods
        .drawnNumber()
        .accounts({
          game: gameKeypair.publicKey,
        })
        .view();

      expect(typeof drawnNumber).toBe("number");

      const prize = await program.methods
        .prize()
        .accounts({
          game: gameKeypair.publicKey,
          bet: betPDA,
        })
        .view();
      expect(Number(prize)).toBe(0);
    },
    15 * 1000
  );
});
