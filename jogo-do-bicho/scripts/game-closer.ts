import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import GotcritterIDL from "../anchor/target/idl/gotcritter.json";
import type { Gotcritter } from "../anchor/target/types/gotcritter";
import { closeGame, findHigherGame } from "@project/anchor";

/**
 * This script will continuously check for any game that can be closed and will close it.
 *
 * to run:
 * npx esrun scripts/game-closer.ts
 */

// TODO: review and finish this script

async function main() {
  // Connect to the local network
  const connection = new Connection("http://localhost:8899", "confirmed");

  // Create a new wallet for testing
  const payer = Keypair.generate();
  console.log("Wallet address:", payer.publicKey.toBase58());

  // Set up the Anchor provider with the payer
  const provider = new AnchorProvider(
    connection,
    new anchor.Wallet(payer),
    AnchorProvider.defaultOptions()
  );

  // Load the program using the IDL
  // const programId = new PublicKey(GotcritterIDL.address);
  const program = new Program(GotcritterIDL as Gotcritter, provider);

  // Request airdrop
  const signature = await connection.requestAirdrop(
    payer.publicKey,
    2000 * LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(signature);

  try {
    const foundGame = await findHigherGame(connection, program, {
      bettingPeriodEnded: false,
      minEndingSlotPast: true,
      onlyPublic: true,
      withBetOnAllNumbers: true,
    });

    console.log("Selected game:", foundGame.publicKey.toBase58());

    const result = await closeGame(provider, foundGame.publicKey);
    console.log("Transaction completed successfully:", result);
  } catch (error) {
    console.error(
      "Error in main execution:",
      error instanceof Error ? error.message : String(error)
    );
  }
}

main();
