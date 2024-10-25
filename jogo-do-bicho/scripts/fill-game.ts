import "dotenv/config";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import {
  Program,
  AnchorProvider,
  web3,
  BorshCoder,
  EventParser,
} from "@coral-xyz/anchor";
import GotcritterIDL from "../anchor/target/idl/gotcritter.json";
import type { Gotcritter } from "../anchor/target/types/gotcritter";
import { closeGame, findGames } from "@project/anchor";
import {
  airdropIfRequired,
  getKeypairFromEnvironment,
} from "@solana-developers/helpers";
import BN from "bn.js";

/**
 * This script will bet on all numbers that were not bet on yet of a specific game.
 *
 * to run:
 * npx esrun scripts/fill-game.ts
 */

async function main() {
  const suppliedToPubkey = process.argv[2] || null;

  if (!suppliedToPubkey) {
    console.log(`Please provide a public key of the game`);
    process.exit(1);
  }

  const gamePublicKey = new PublicKey(suppliedToPubkey);

  // Connect to the local network
  const connection = new Connection("http://localhost:8899", "confirmed");

  // Create a new wallet for testing
  const payer = getKeypairFromEnvironment("SECRET_KEY"); // if not found, create a .env file just like .env.example
  console.log("Wallet address:", payer.publicKey.toBase58());

  // Set up the Anchor provider with the payer
  const provider = new AnchorProvider(
    connection,
    new anchor.Wallet(payer),
    AnchorProvider.defaultOptions()
  );

  // Load the program using the IDL
  const program = new Program(GotcritterIDL as Gotcritter, provider);

  // Request airdrop
  await airdropIfRequired(
    connection,
    payer.publicKey,
    2000 * LAMPORTS_PER_SOL,
    1000 * LAMPORTS_PER_SOL
  );

  const game = await program.account.game.fetch(gamePublicKey);

  const eventParser = new EventParser(
    program.programId,
    new BorshCoder(program.idl)
  );

  for (let number = 0; number < 25; number++) {
    if (game.betsPerNumber[number].eq(new BN(0))) {
      console.log(`Placing bet on number ${number + 1}`);
      const signature = await program.methods
        .placeBet(number + 1, new BN(LAMPORTS_PER_SOL * 0.01))
        .accounts({
          game: gamePublicKey,
          bettor: provider.publicKey,
        })
        .rpc();
      console.log(
        `Bet placed on number ${number + 1} with signature ${signature}`
      );

      const latestBlockhash = await provider.connection.getLatestBlockhash();
      await provider.connection.confirmTransaction(
        { signature: signature, ...latestBlockhash },
        "confirmed"
      );
      const betTransaction = await provider.connection.getTransaction(
        signature,
        {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        }
      );

      const events = Array.from(
        eventParser.parseLogs(betTransaction?.meta?.logMessages ?? [])
      );
      const betPlacedEvent = events.find((event) => event.name === "betPlaced");
      console.log(
        "Bet placed time:",
        betPlacedEvent?.data.timestamp.toNumber()
      );
    }
  }
}

main();
