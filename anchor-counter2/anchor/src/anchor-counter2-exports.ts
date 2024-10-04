// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { Cluster, PublicKey } from '@solana/web3.js';
import AnchorCounter2IDL from '../target/idl/anchor_counter2.json';
import type { AnchorCounter2 } from '../target/types/anchor_counter2';

// Re-export the generated IDL and type
export { AnchorCounter2, AnchorCounter2IDL };

// The programId is imported from the program IDL.
export const ANCHOR_COUNTER2_PROGRAM_ID = new PublicKey(
  AnchorCounter2IDL.address
);

// This is a helper function to get the AnchorCounter2 Anchor program.
export function getAnchorCounter2Program(provider: AnchorProvider) {
  return new Program(AnchorCounter2IDL as AnchorCounter2, provider);
}

// This is a helper function to get the program ID for the AnchorCounter2 program depending on the cluster.
export function getAnchorCounter2ProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
    case 'testnet':
    case 'mainnet-beta':
    default:
      return ANCHOR_COUNTER2_PROGRAM_ID;
  }
}
