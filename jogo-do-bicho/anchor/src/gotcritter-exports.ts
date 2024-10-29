import {
  AnchorProvider,
  Program,
  ProgramAccount,
  web3,
  utils,
  BorshCoder,
  EventParser,
} from "@coral-xyz/anchor";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  TransactionSignature,
} from "@solana/web3.js";
import GotcritterIDL from "../target/idl/gotcritter.json";
import type { Gotcritter } from "../target/types/gotcritter";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import BN from "bn.js";

// Re-export the generated IDL and type
export { Gotcritter, GotcritterIDL };

// The programId is imported from the program IDL.
export const GOTCRITTER_PROGRAM_ID = new PublicKey(GotcritterIDL.address);

export type Game = {
  creator: PublicKey;
  participants: PublicKey[];
  totalValue: BN;
  minEndingSlot: BN;
  combinedHash: number[];
  betsPerNumber: BN[];
  bettingPeriodEnded: boolean;
  drawnNumberConfirmed: number | null;
  numberOfBets: BN;
  valueProvidedToWinners: BN;
};

export type Bet = {
  game: PublicKey;
  bettor: PublicKey;
  value: BN;
  number: number;
  prizeClaimed: boolean;
};

// This is a helper function to get the Gotcritter Anchor program.
export function getGotcritterProgram(provider: AnchorProvider) {
  return new Program(GotcritterIDL as Gotcritter, provider);
}

export async function findGames(
  connection: Connection,
  program: Program<Gotcritter>,
  options?: {
    onlyPublic?: boolean;
    bettingPeriodEnded?: boolean;
    minEndingSlotPast?: boolean;
    withBetOnAllNumbers?: boolean;
  }
): Promise<ProgramAccount<Game>[]> {
  const filters: web3.GetProgramAccountsFilter[] = [];

  if (options?.onlyPublic === true) {
    filters.push({
      memcmp: {
        offset: 8 + 32, // 8 bytes for discriminator + 32 bytes for creator
        bytes: utils.bytes.bs58.encode(Buffer.from([0, 0, 0, 0])), // 4 bytes representing an empty vector (participants)
      },
    });
  }

  if (options?.bettingPeriodEnded === false) {
    filters.push({
      memcmp: {
        offset: 8 + 32 + 4 + 8 + 8 + 32 + 200, // offset for betting_period_ended
        bytes: utils.bytes.bs58.encode(Buffer.from([0])), // false for betting_period_ended
      },
    });
  } else if (options?.bettingPeriodEnded === true) {
    filters.push({
      memcmp: {
        offset: 8 + 32 + 4 + 8 + 8 + 32 + 200, // offset for betting_period_ended
        bytes: utils.bytes.bs58.encode(Buffer.from([1])), // true for betting_period_ended
      },
    });
  }

  const games = await program.account.game.all(filters);

  const filteredGames: ProgramAccount<Game>[] = [];

  for (const game of games) {
    if (
      (options?.onlyPublic !== true || !game.account.participants.length) && // double check
      (options?.bettingPeriodEnded === undefined ||
        options?.bettingPeriodEnded === game.account.bettingPeriodEnded) && // double check
      (options?.minEndingSlotPast === undefined ||
        game.account.minEndingSlot.lt(new BN(await connection.getSlot()))) && // filter by minEndingSlotPast
      (options?.withBetOnAllNumbers === undefined ||
        game.account.betsPerNumber.every((bet) => bet.gt(new BN(0)))) // filter by checking if all betsPerNumber are greater than 0
    ) {
      filteredGames.push(game);
    }
  }

  filteredGames.sort((a, b) =>
    a.account.totalValue.gt(b.account.totalValue) ? -1 : 1
  );

  return filteredGames;
}

export async function closeGame(
  provider: AnchorProvider,
  game: PublicKey,
  betNumber: number = 1,
  verbose: boolean = false
): Promise<{ signature: TransactionSignature; reward?: BN }> {
  const connection = provider.connection;
  const program = new Program(GotcritterIDL as Gotcritter, provider);
  const payer = provider.wallet;

  const eventParser = new EventParser(
    program.programId,
    new BorshCoder(program.idl)
  );

  while (true) {
    try {
      const { blockhash: blockhashAsBase58 } =
        await connection.getLatestBlockhash();

      const blockhash = Buffer.from(bs58.decode(blockhashAsBase58)).toString(
        "hex"
      );

      if (blockhash.slice(-2)[0] === blockhash.slice(-2)[1]) {
        if (verbose) {
          console.log(
            `Blockhash found with repeated characters: ${blockhashAsBase58} \n${blockhash}`
          );
        }

        const instruction = await program.methods
          .placeBet(betNumber, new BN(LAMPORTS_PER_SOL)) // new BN(0.001).mul(new BN(LAMPORTS_PER_SOL));
          .accounts({
            game: game,
            bettor: payer.publicKey,
          })
          .instruction();

        const transaction = new Transaction().add(instruction);
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = payer.publicKey;

        const currentSlot = await connection.getSlot();
        if (verbose) {
          console.log("Current slot:", currentSlot);
        }

        // sending a bet immediately after a blockhash with repeated characters will close the game
        transaction.lastValidBlockHeight = currentSlot + 1; // so we ask to invalidate the transaction if not included in the next block

        const signature = await provider.sendAndConfirm(transaction, [], {
          commitment: "confirmed",
          maxRetries: 1,
        });

        const tx = await provider.connection.getTransaction(signature, {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        });

        const events = [...eventParser.parseLogs(tx?.meta?.logMessages ?? [])];
        const ev = events.find((event) => event.name === "endOfBettingPeriod");
        const reward = ev?.data.reward;

        if (verbose) {
          console.log("Successful transaction:", signature);
        }
        return { signature, reward };
      }
    } catch (error) {
      throw new Error("Error observing or sending transaction");
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}
