"use client";

import {
  GOTCRITTER_PROGRAM_ID as programId,
  getGotcritterProgram,
  Game,
  Bet,
} from "@project/anchor";
import * as anchor from "@coral-xyz/anchor";
import { useConnection } from "@solana/wallet-adapter-react";
import { useMutation, useQuery } from "@tanstack/react-query";

import toast from "react-hot-toast";
import { useCluster } from "../cluster/cluster-data-access";
import { useAnchorProvider } from "../solana/solana-provider";
import { useTransactionToast } from "../ui/ui-layout";

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

  const currentSlot = useQuery({
    queryKey: ["current-slot", { cluster }],
    refetchInterval: 100,
    queryFn: () => connection.getSlot(),
  });

  const currentBlockhash = useQuery({
    queryKey: ["current-blockhash", { cluster }],
    refetchInterval: 100,
    queryFn: async () => {
      return await connection.getLatestBlockhash();
    },
  });

  const createGame = useMutation({
    mutationKey: ["gotcritter", "greet", { cluster }],
    mutationFn: (duration: anchor.BN) => {
      const gameKeypair = anchor.web3.Keypair.generate();
      return program.methods
        .createGame(duration, null)
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
    currentSlot,
    currentBlockhash,
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

  const userBets = useQuery({
    queryKey: [
      "user-bets",
      { cluster, game: game.publicKey, user: provider.publicKey },
    ],
    queryFn: () =>
      program.account.bet.all([
        {
          memcmp: {
            offset: 8, // Pula o discriminador
            bytes: game.publicKey.toBase58(),
          },
        },
        {
          memcmp: {
            offset: 40, // 8 (discriminador) + 32 (game pubkey)
            bytes: provider.publicKey.toBase58(),
          },
        },
      ]),
  });

  const placeBet = useMutation({
    mutationFn: (params: { number: number; value: anchor.BN }) =>
      program.methods
        .placeBet(params.number, params.value)
        .accounts({ game: game.publicKey, bettor: provider.publicKey })
        .rpc(),
    onSuccess: (signature) => {
      transactionToast(signature);
      return Promise.all([userBets.refetch(), games.refetch()]);
    },
  });

  return {
    drawnNumber,
    placeBet,
    userBets,
  };
}

export function useBetProgramAccount({
  bet,
}: {
  bet: anchor.ProgramAccount<Bet>;
}) {
  const transactionToast = useTransactionToast();
  const { cluster } = useCluster();
  const provider = useAnchorProvider();
  const program = getGotcritterProgram(provider);

  const prize = useQuery({
    queryKey: ["prize", { cluster, bet: bet.publicKey }],
    refetchInterval: 5000,
    queryFn: () =>
      program.methods
        .prize()
        .accounts({ bet: bet.publicKey, game: bet.account.game })
        .view(),
  });

  const claimPrize = useMutation({
    mutationFn: () =>
      program.methods
        .claimPrize()
        .accounts({
          bet: bet.publicKey,
          game: bet.account.game,
          bettor: provider.publicKey,
        })
        .rpc(),
    onSuccess: (signature) => {
      transactionToast(signature);
    },
  });

  return {
    prize,
    claimPrize,
  };
}
