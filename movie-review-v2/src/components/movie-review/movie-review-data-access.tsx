"use client";

import {
  MOVIE_REVIEW_PROGRAM_ID as programId,
  getMovieReviewProgram,
  getMovieReviewProgramId,
} from "@project/anchor";
import { useConnection } from "@solana/wallet-adapter-react";
import {
  Cluster,
  Keypair,
  ParsedAccountData,
  PublicKey,
} from "@solana/web3.js";
import { useMutation, useQuery } from "@tanstack/react-query";

import toast from "react-hot-toast";
import { useCluster } from "../cluster/cluster-data-access";
import { useAnchorProvider } from "../solana/solana-provider";
import { useTransactionToast } from "../ui/ui-layout";
import { useMemo } from "react";
import { ProgramAccount } from "@coral-xyz/anchor";

export type MovieReview = {
  reviewer: PublicKey;
  rating: number;
  title: string;
  description: string;
};

export function useMovieReviewProgram() {
  const { connection } = useConnection();
  const { cluster } = useCluster();
  const transactionToast = useTransactionToast();
  const provider = useAnchorProvider();
  const programId = useMemo(
    () => getMovieReviewProgramId(cluster.network as Cluster),
    [cluster]
  );
  const program = getMovieReviewProgram(provider);

  const accounts = useQuery({
    queryKey: ["movie-review", "all", { cluster }],
    queryFn: () => program.account.movieAccountState.all(),
  });

  const programAccount = useQuery({
    queryKey: ["get-program-account", { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  });

  const tokenMintAccount = useQuery({
    queryKey: ["token-mint-pda", { cluster }],
    queryFn: () =>
      connection.getParsedAccountInfo(
        PublicKey.findProgramAddressSync([Buffer.from("mint")], programId)[0]
      ),
  });

  const initializeTokenMint = useMutation({
    mutationFn: () => program.methods.initializeTokenMint().rpc(),

    onSuccess: (signature) => {
      transactionToast(signature);
      return Promise.all([tokenMintAccount.refetch(), accounts.refetch()]);
    },
    onError: () => toast.error("Failed to initialize token mint"),
  });

  const addMovieReview = useMutation({
    mutationFn: (params: {
      title: string;
      description: string;
      rating: number;
    }) =>
      program.methods
        .addMovieReview(params.title, params.description, params.rating)
        .rpc(),
    onSuccess: (tx) => {
      transactionToast(tx);
      return accounts.refetch();
    },
  });

  return {
    program,
    programId,
    accounts,
    programAccount,
    tokenMintAccount,
    initializeTokenMint,
    addMovieReview,
  };
}

export function useMovieReviewProgramAccount({
  account,
}: {
  account: ProgramAccount<MovieReview>;
}) {
  const transactionToast = useTransactionToast();
  const { accounts, program } = useMovieReviewProgram();

  const updateMovieReview = useMutation({
    mutationFn: (params: { description: string; rating: number }) =>
      program.methods
        .updateMovieReview(
          account.account.title,
          params.description,
          params.rating
        )
        .rpc(),
    onSuccess: (tx) => {
      transactionToast(tx);
      return accounts.refetch();
    },
  });

  return {
    updateMovieReview,
  };
}
