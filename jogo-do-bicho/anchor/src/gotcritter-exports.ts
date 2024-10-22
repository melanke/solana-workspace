// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import GotcritterIDL from "../target/idl/gotcritter.json";
import type { Gotcritter } from "../target/types/gotcritter";

// Re-export the generated IDL and type
export { Gotcritter, GotcritterIDL };

// The programId is imported from the program IDL.
export const GOTCRITTER_PROGRAM_ID = new PublicKey(GotcritterIDL.address);

// This is a helper function to get the Gotcritter Anchor program.
export function getGotcritterProgram(provider: AnchorProvider) {
  return new Program(GotcritterIDL as Gotcritter, provider);
}
