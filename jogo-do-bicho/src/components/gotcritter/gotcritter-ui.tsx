"use client";

import { ProgramAccount, BN } from "@coral-xyz/anchor";
import {
  Game,
  useGameProgramAccount,
  useGotCritterProgram,
} from "./gotcritter-data-access";
import { ellipsify } from "../ui/ui-layout";
import { quickDialogForm } from "../ui/quickDialogForm";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export function GotCritterCreate() {
  const { createGame } = useGotCritterProgram();

  return (
    <div className="flex gap-4 justify-center">
      <button
        className="btn btn-xs lg:btn-md btn-primary"
        onClick={() => createGame.mutateAsync()}
        disabled={createGame.isPending}
      >
        Create game {createGame.isPending && "..."}
      </button>
    </div>
  );
}

export function GotCritterProgram() {
  const { games, programAccount } = useGotCritterProgram();

  if (programAccount.isLoading) {
    return <span className="loading loading-spinner loading-lg"></span>;
  }
  if (!programAccount.data?.value) {
    return (
      <div className="alert alert-info flex justify-center">
        <span>
          Program account not found. Make sure you have deployed the program and
          are on the correct cluster.
        </span>
      </div>
    );
  }
  return (
    <div className={"space-y-6"}>
      {games.isLoading ? (
        <span className="loading loading-spinner loading-lg"></span>
      ) : games.data?.length ? (
        <div className="grid md:grid-cols-2 gap-4">
          {games.data?.map((game) => (
            <GotCritterCard key={game.publicKey.toString()} game={game} />
          ))}
        </div>
      ) : (
        <div className="text-center">
          <h2 className={"text-2xl"}>No games</h2>
          No games found. Create one above to get started.
        </div>
      )}
    </div>
  );
}

function GotCritterCard({ game }: { game: ProgramAccount<Game> }) {
  const { isBettingPeriodEnded, drawnNumber, placeBet } = useGameProgramAccount(
    { game }
  );

  const handlePlaceBet = async () => {
    const [number, value] = await quickDialogForm({
      title: "Place Bet",
      inputs: [
        { label: "Number", type: "number" },
        { label: "Value", type: "number" },
      ],
    });

    placeBet.mutateAsync({
      number: parseInt(number),
      value: new BN(value).mul(new BN(LAMPORTS_PER_SOL)),
    });
  };

  return (
    <div className="card card-bordered border-base-300 border-4 text-neutral-content">
      <div className="card-body">
        <h2 className="card-title justify-center text-3xl cursor-pointer mb-2">
          {ellipsify(game.publicKey.toString())}
        </h2>
        <p>
          <span className="font-bold">Creator:</span>{" "}
          {ellipsify(game.account.creator.toString())}
        </p>
        <p>
          <span className="font-bold">Open:</span>{" "}
          {game.account.open ? "Yes" : "No"}
        </p>
        {!game.account.open && (
          <p>
            <span className="font-bold">Participants:</span>{" "}
            {game.account.participants.map((p) => ellipsify(p.toString()))}
          </p>
        )}
        <p>
          <span className="font-bold">Total Value:</span>{" "}
          {game.account.totalValue.toString()}
        </p>
        {/* <p>
          <span className="font-bold">Initial Slots:</span>{" "}
          {game.account.initialSlots.toString()}
        </p> 
        <p>
          <span className="font-bold">Last Blockhash:</span>{" "}
          {game.account.lastBlockhash.toString()}
        </p>
        <p>
          <span className="font-bold">Combined Hash:</span>{" "}
          {game.account.combinedHash.toString()}
        </p>
        <p>
          <span className="font-bold">Bets Per Number:</span>{" "}
          {game.account.betsPerNumber.map((b) => b.toString())}
        </p> */}
        <p>
          <span className="font-bold">Betting Period Ended:</span>{" "}
          {isBettingPeriodEnded.data ? "true" : "false"}
        </p>
        <p>
          <span className="font-bold">Drawn Number:</span>{" "}
          {drawnNumber.data?.toString()}
        </p>
        <p>
          <span className="font-bold">Number of Bets:</span>{" "}
          {game.account.numberOfBets.toString()}
        </p>
        <p>
          <span className="font-bold">Value Provided to Winners:</span>{" "}
          {game.account.valueProvidedToWinners.toString()}
        </p>
        <div className="card-actions justify-around">
          <button
            className="btn btn-xs lg:btn-md btn-outline"
            onClick={handlePlaceBet}
            disabled={placeBet.isPending}
          >
            Place Bet
          </button>
        </div>
      </div>
    </div>
  );
}
