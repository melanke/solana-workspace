// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import MovieReviewProgramIDL from "../target/idl/movie_review_program.json";
import type { MovieReviewProgram } from "../target/types/movie_review_program";

// Re-export the generated IDL and type
export { MovieReviewProgram, MovieReviewProgramIDL };

// The programId is imported from the program IDL.
export const MOVIE_REVIEW_PROGRAM_ID = new PublicKey(
  MovieReviewProgramIDL.address
);

// This is a helper function to get the MovieReviewProgram Anchor program.
export function getMovieReviewProgram(provider: AnchorProvider) {
  return new Program(MovieReviewProgramIDL as MovieReviewProgram, provider);
}

// This is a helper function to get the program ID for the AnchorCounter2 program depending on the cluster.
export function getMovieReviewProgramId(cluster: Cluster) {
  switch (cluster) {
    case "devnet":
    case "testnet":
    case "mainnet-beta":
    default:
      return MOVIE_REVIEW_PROGRAM_ID;
  }
}
