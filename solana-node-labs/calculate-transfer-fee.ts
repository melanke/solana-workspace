import {
  Connection,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import "dotenv/config";
import { getKeypairFromEnvironment } from "@solana-developers/helpers";
  
const suppliedToPubkey = process.argv[2] || null;
  
if (!suppliedToPubkey) {
  console.log(`Please provide a public key to send to`);
  process.exit(1);
}
  
const senderKeypair = getKeypairFromEnvironment("SECRET_KEY");
  
const toPubkey = new PublicKey(suppliedToPubkey);
  
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

const transaction = new Transaction();
 
const LAMPORTS_TO_SEND = 5000;
 

const sendSolInstruction = SystemProgram.transfer({
  fromPubkey: senderKeypair.publicKey,
  toPubkey,
  lamports: LAMPORTS_TO_SEND,
});
 
transaction.add(sendSolInstruction);


let blockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
transaction.recentBlockhash = blockhash;
transaction.feePayer = senderKeypair.publicKey
const feesResponse = await connection.getFeeForMessage(
  transaction.compileMessage(),
  'confirmed',
);
const feeInLamports = feesResponse.value;

console.log(`💸 Fee to send transaction is ${feeInLamports} lamports!`);

const resp = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
const data = await resp.json();

const solPrice = data.solana.usd;

const feeInSol = feeInLamports! / LAMPORTS_PER_SOL;

const feeInUSD = feeInSol * solPrice;

console.log(`💸 Fee to send transaction is ${feeInUSD} USD!`);