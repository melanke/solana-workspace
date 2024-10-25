import "dotenv/config";
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, web3 } from "@coral-xyz/anchor";
import GotcritterIDL from "../anchor/target/idl/gotcritter.json";
import type { Gotcritter } from "../anchor/target/types/gotcritter";
import { closeGame, findGames } from "@project/anchor";
import {
  airdropIfRequired,
  getKeypairFromEnvironment,
} from "@solana-developers/helpers";
import BN from "bn.js";

/**
 * This script will continuously check for any game that can be closed and will close it.
 * If there are no public games, it will create a new one.
 *
 * to run:
 * npx esrun scripts/game-recycler.ts
 */

// // around 12 HOURS in milliseconds / 400ms (400ms is the amount of time it takes to process a block)
// const DEFAULT_GAME_DURATION = Math.floor((12 * 60 * 60 * 1000) / 400);
// OR
// around 5 minutes in milliseconds / 400ms (400ms is the amount of time it takes to process a block)
const DEFAULT_GAME_DURATION = Math.floor((5 * 60 * 1000) / 400);

async function main() {
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

  while (true) {
    // Request airdrop
    await airdropIfRequired(
      connection,
      payer.publicKey,
      2000 * LAMPORTS_PER_SOL,
      1000 * LAMPORTS_PER_SOL
    );

    const closeableGames = await findGames(connection, program, {
      bettingPeriodEnded: false,
      minEndingSlotPast: true,
      onlyPublic: true,
      withBetOnAllNumbers: true,
    });

    if (closeableGames.length === 0) {
      console.log("No closeable games found");
    } else {
      console.log("Closing games:", closeableGames.length);
      for (const gameToClose of closeableGames) {
        console.log("Selected game:", gameToClose.publicKey.toBase58());

        // TODO: maybe we could close all closeableGames at once
        const { signature, reward } = await closeGame(
          provider,
          gameToClose.publicKey,
          1,
          true
        );

        console.log("- Transaction completed successfully:", signature);
        console.log("- Reward:", reward?.toString() ?? "none");
      }
    }

    const anyPublicGame = await findGames(connection, program, {
      onlyPublic: true,
      bettingPeriodEnded: false,
    });

    if (anyPublicGame.length === 0) {
      const gameKeypair = web3.Keypair.generate();
      await program.methods
        .createGame(new BN(DEFAULT_GAME_DURATION), null)
        .accounts({
          game: gameKeypair.publicKey,
          creator: provider.publicKey,
        })
        .signers([gameKeypair])
        .rpc();
      console.log("Created new game:", gameKeypair.publicKey.toBase58());
    } else {
      console.log("Public games found:", anyPublicGame.length);
    }

    await new Promise((resolve) => setTimeout(resolve, 15000));
  }
}

main();
