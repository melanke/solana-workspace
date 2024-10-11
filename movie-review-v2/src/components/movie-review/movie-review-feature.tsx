"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { ExplorerLink } from "../cluster/cluster-ui";
import { WalletButton } from "../solana/solana-provider";
import { AppHero, ellipsify } from "../ui/ui-layout";
import { useMovieReviewProgram } from "./movie-review-data-access";
import { MovieReviewCreate, MovieReviewProgram } from "./movie-review-ui";

export default function MovieReviewFeature() {
  const { publicKey } = useWallet();
  const { programId } = useMovieReviewProgram();

  return publicKey ? (
    <div>
      <AppHero
        title="MovieReview"
        subtitle={'Run the program by clicking the "Run program" button.'}
      >
        <p className="mb-6">
          <ExplorerLink
            path={`account/${programId}`}
            label={ellipsify(programId.toString())}
          />
        </p>
        <MovieReviewCreate />
      </AppHero>
      <MovieReviewProgram />
    </div>
  ) : (
    <div className="max-w-4xl mx-auto">
      <div className="hero py-[64px]">
        <div className="hero-content text-center">
          <WalletButton className="btn btn-primary" />
        </div>
      </div>
    </div>
  );
}
