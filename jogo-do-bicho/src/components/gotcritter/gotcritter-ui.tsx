"use client";

import { ProgramAccount, BN } from "@coral-xyz/anchor";
import {
  useBetProgramAccount,
  useGameProgramAccount,
  useGotCritterProgram,
} from "./gotcritter-data-access";
import { ellipsify } from "../ui/ui-layout";
import { quickDialogForm } from "../ui/quickDialogForm";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useMemo, useState } from "react";
import bs58 from "bs58";
import { WalletButton } from "../solana/solana-provider";
import { useWallet } from "@solana/wallet-adapter-react";
import { Bet, Game } from "@project/anchor";

export function GotCritterCreate() {
  const { createGame } = useGotCritterProgram();
  const { publicKey } = useWallet();

  const handleCreateGame = async () => {
    const [duration] = await quickDialogForm({
      title: "Create Game",
      inputs: [{ label: "Duration", type: "number" }],
    });

    await createGame.mutateAsync(new BN(duration));
  };

  return (
    <div className="flex gap-4 justify-center">
      {publicKey ? (
        <button
          className="btn btn-xs lg:btn-md btn-primary"
          onClick={handleCreateGame}
          disabled={createGame.isPending}
        >
          Create game {createGame.isPending && "..."}
        </button>
      ) : (
        <WalletButton className="btn btn-primary" />
      )}
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
        games.data?.map((game) => (
          <GameCard key={game.publicKey.toString()} game={game} />
        ))
      ) : (
        <div className="text-center">
          <h2 className={"text-2xl"}>No games</h2>
          No games found. Create one above to get started.
        </div>
      )}
    </div>
  );
}

function GameCard({ game }: { game: ProgramAccount<Game> }) {
  const { drawnNumber, placeBet, userBets } = useGameProgramAccount({ game });
  const { currentSlot, currentBlockhash } = useGotCritterProgram();
  const { publicKey } = useWallet();

  // Converts currentBlockhash to hexadecimal
  const currentBlockhashHex = useMemo(() => {
    if (currentBlockhash.data?.blockhash) {
      return Buffer.from(bs58.decode(currentBlockhash.data.blockhash)).toString(
        "hex"
      );
    }
    return "";
  }, [currentBlockhash.data?.blockhash]);

  // Function to get the last two digits of the hexadecimal string
  const getLastTwoDigits = (hashHex: string) => {
    return hashHex.slice(-2);
  };

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

  const [showFullKey, setShowFullKey] = useState(false);

  const toggleKeyDisplay = () => {
    setShowFullKey(!showFullKey);
  };

  return (
    <div className="card card-bordered border-base-300 border-4 text-neutral-content mb-2">
      <div className="card-body">
        <h2
          className="card-title justify-center text-3xl cursor-pointer"
          onClick={toggleKeyDisplay}
        >
          {showFullKey
            ? game.publicKey.toString()
            : ellipsify(game.publicKey.toString())}
        </h2>
        <div className="card-actions justify-around my-4">
          {publicKey ? (
            <button
              className="btn btn-xs lg:btn-md btn-outline"
              onClick={handlePlaceBet}
              disabled={placeBet.isPending}
            >
              Place Bet
            </button>
          ) : (
            <WalletButton className="btn btn-outline" />
          )}
        </div>
        <div className="w-[640px] flex flex-1 gap-2">
          <div className="flex flex-col gap-1">
            <div>
              <span className="font-bold">Creator:</span>{" "}
              {ellipsify(game.account.creator.toString())}
            </div>
            <div>
              <span className="font-bold">Private:</span>{" "}
              {game.account.participants.length > 0 ? "Yes" : "No"}
            </div>
            {game.account.participants.length > 0 && (
              <div>
                <span className="font-bold">Participants:</span>{" "}
                {game.account.participants.map((p) => ellipsify(p.toString()))}
              </div>
            )}
            <div>
              <span className="font-bold">Total Value:</span>{" "}
              {game.account.totalValue.toNumber() / LAMPORTS_PER_SOL} SOL
            </div>
            <div>
              <span className="font-bold">Betting Period Ended:</span>{" "}
              {game.account.bettingPeriodEnded ? "true" : "false"}
            </div>
            <div>
              <span className="font-bold">Drawn Number:</span>{" "}
              {drawnNumber.data?.toString()}
            </div>
            <div>
              <span className="font-bold">Combined Hash:</span>{" "}
              <div className="max-w-32">
                {game.account.combinedHash.toString().replace(/,/g, ", ")}
              </div>
            </div>
            {!game.account.bettingPeriodEnded && (
              <>
                <div>
                  <span className="font-bold">Progress:</span>{" "}
                  {currentSlot.data?.toString()} /{" "}
                  {game.account.minEndingSlot.toString()}
                </div>
                <div>
                  <span className="font-bold">Current Blockhash (last 2):</span>{" "}
                  {getLastTwoDigits(currentBlockhashHex)}
                </div>
              </>
            )}
            <div>
              <span className="font-bold">Number of Bets:</span>{" "}
              {game.account.numberOfBets.toString()}
            </div>
            <div>
              <span className="font-bold">Value Provided to Winners:</span>{" "}
              {game.account.valueProvidedToWinners.toNumber() /
                LAMPORTS_PER_SOL}{" "}
              SOL
            </div>
            {game.account.betsPerNumber.map((b, i) => (
              <div key={i}>
                <span className="font-bold">Bet {i + 1}:</span>{" "}
                {b.toNumber() / LAMPORTS_PER_SOL} SOL
              </div>
            ))}
          </div>
          <div className="flex-1">
            <h3 className="font-bold">Your Bets:</h3>{" "}
            <div className="flex flex-wrap gap-1">
              {userBets.isLoading ? (
                <span className="loading loading-spinner loading-lg"></span>
              ) : userBets.data?.length ? (
                userBets.data
                  .toSorted((a, b) => a.account.number - b.account.number)
                  .map((bet) => (
                    <BetCard
                      key={bet.publicKey.toString()}
                      bet={bet}
                      game={game}
                    />
                  ))
              ) : (
                <div className="text-center">
                  You didn&apos;t place any bets yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BetCard({
  bet,
  game,
}: {
  bet: ProgramAccount<Bet>;
  game: ProgramAccount<Game>;
}) {
  const { prize, claimPrize } = useBetProgramAccount({ bet });

  return (
    <div className="flex flex-col gap-1 bg-base-300 rounded p-2">
      <div>
        <span className="font-bold">Number:</span>{" "}
        {bet.account.number.toString()}
      </div>
      <div>
        <span className="font-bold">Value:</span>{" "}
        {bet.account.value.toNumber() / LAMPORTS_PER_SOL} SOL
      </div>
      <div>
        <span className="font-bold">Estimated Prize:</span>{" "}
        {prize.data?.toNumber() / LAMPORTS_PER_SOL} SOL
      </div>
      {prize.data && prize.data > 0 && game.account.bettingPeriodEnded && (
        <>
          {!bet.account.prizeClaimed ? (
            <button
              className="btn btn-xs btn-primary lg:btn-md"
              onClick={() => claimPrize.mutateAsync()}
            >
              Claim Prize
            </button>
          ) : (
            <div className="bg-black p-1 rounded font-bold">Prize Claimed</div>
          )}
        </>
      )}
    </div>
  );
}
