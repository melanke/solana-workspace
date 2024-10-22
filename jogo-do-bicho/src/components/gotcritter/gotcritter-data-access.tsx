"use client";

import {
  GOTCRITTER_PROGRAM_ID as programId,
  getGotcritterProgram,
} from "@project/anchor";
import * as anchor from "@coral-xyz/anchor";
import { useConnection } from "@solana/wallet-adapter-react";
import { useMutation, useQuery } from "@tanstack/react-query";

import toast from "react-hot-toast";
import { useCluster } from "../cluster/cluster-data-access";
import { useAnchorProvider } from "../solana/solana-provider";
import { useTransactionToast } from "../ui/ui-layout";
import { PublicKey } from "@solana/web3.js";

export type Game = {
  creator: PublicKey;
  open: boolean;
  participants: PublicKey[];
  totalValue: anchor.BN;
  initialSlots: anchor.BN;
  lastBlockhash: number[];
  combinedHash: number[];
  betsPerNumber: anchor.BN[];
  bettingPeriodEndedCache: boolean | null;
  drawnNumberCache: number | null;
  numberOfBets: anchor.BN;
  valueProvidedToWinners: anchor.BN;
};

export function useGotCritterProgram() {
  const { connection } = useConnection();
  const { cluster } = useCluster();
  const transactionToast = useTransactionToast();
  const provider = useAnchorProvider();
  const program = getGotcritterProgram(provider);

  const programAccount = useQuery({
    queryKey: ["get-program-account", { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  });

  const games = useQuery({
    queryKey: ["game", "all", { cluster }],
    queryFn: () => program.account.game.all(),
  });

  const createGame = useMutation({
    mutationKey: ["gotcritter", "greet", { cluster }],
    mutationFn: () => {
      const gameKeypair = anchor.web3.Keypair.generate();
      return program.methods
        .createGame(true, null)
        .accounts({
          game: gameKeypair.publicKey,
          creator: provider.publicKey,
        })
        .signers([gameKeypair])
        .rpc();
    },
    onSuccess: (signature) => {
      transactionToast(signature);
      return games.refetch();
    },
    onError: () => toast.error("Failed to run program"),
  });

  return {
    program,
    programId,
    programAccount,
    games,
    createGame,
  };
}

export function useGameProgramAccount({
  game,
}: {
  game: anchor.ProgramAccount<Game>;
}) {
  const transactionToast = useTransactionToast();
  const { games, program } = useGotCritterProgram();
  const { cluster } = useCluster();
  const provider = useAnchorProvider();

  const drawnNumber = useQuery({
    queryKey: ["drawn-number", { cluster, game: game.publicKey }],
    refetchInterval: 1000,
    queryFn: () =>
      program.methods.drawnNumber().accounts({ game: game.publicKey }).view(),
  });

  const isBettingPeriodEnded = useQuery({
    queryKey: ["betting-period-ended", { cluster, game: game.publicKey }],
    queryFn: () =>
      program.methods
        .isBettingPeriodEnded()
        .accounts({ game: game.publicKey })
        .view(),
  });

  const placeBet = useMutation({
    mutationFn: (params: { number: number; value: anchor.BN }) =>
      program.methods
        .placeBet(params.number, params.value)
        .accounts({ game: game.publicKey, bettor: provider.publicKey })
        .rpc(),
    onSuccess: (signature) => {
      transactionToast(signature);
      return games.refetch();
    },
  });

  return {
    drawnNumber,
    isBettingPeriodEnded,
    placeBet,
  };
}