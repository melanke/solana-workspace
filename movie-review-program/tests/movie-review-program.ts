import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MovieReviewProgram } from "../target/types/movie_review_program";
import { expect } from "chai";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";

describe("movie-review-program", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace
    .MovieReviewProgram as Program<MovieReviewProgram>;

  const movieReview = {
    title: "Fight Club",
    description: "Best movie ever!",
    rating: 4,
  };

  const [movieReviewPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(movieReview.title), provider.wallet.publicKey.toBuffer()],
    program.programId
  );

  const [tokenMintPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("mint")],
    program.programId
  );

  it("Initializes the reward token", async () => {
    const tx = await program.methods.initializeTokenMint().rpc();
  });

  it("Movie review is added", async () => {
    // Add your test here.
    const tx = await program.methods
      .addMovieReview(
        movieReview.title,
        movieReview.description,
        movieReview.rating
      )
      .rpc();

    const movieReviewAccount = await program.account.movieAccountState.fetch(
      movieReviewPda
    );

    expect(movieReviewAccount.title === movieReview.title);
    expect(movieReviewAccount.description === movieReview.description);
    expect(movieReviewAccount.rating === movieReview.rating);
  });

  it("Movie review is updated", async () => {
    const newDescription = "Even better when you watch for the second time!";
    const newRating = 5;

    const tx = await program.methods
      .updateMovieReview(movieReview.title, newDescription, newRating)
      .rpc();

    const movieReviewAccount = await program.account.movieAccountState.fetch(
      movieReviewPda
    );

    expect(movieReviewAccount.title === movieReview.title);
    expect(movieReviewAccount.description === newDescription);
    expect(movieReviewAccount.rating === newRating);
  });

  it("Movie review is deleted", async () => {
    const tx = await program.methods.deleteMovieReview(movieReview.title).rpc();

    try {
      await program.account.movieAccountState.fetch(movieReviewPda);
      // Se a conta ainda existir, falhe o teste
      expect.fail("The account still exists after deletion");
    } catch (error) {
      // Verifique se o erro é o esperado
      expect(error.message).to.include("Account does not exist or has no data");
    }
  });
});
