import { clusterApiUrl, Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
 
const suppliedPublicKey = process.argv[2]; // Bp45u6whcYadT8bGuBv334cKfreEfdSJ72muaVRaLKMw
if (!suppliedPublicKey) {
  throw new Error("Provide a public key to check the balance of!");
}
 
const publicKey = new PublicKey(suppliedPublicKey);

if (!PublicKey.isOnCurve(publicKey)) {
  throw new Error("Invalid public key");
}
 
const connection = new Connection(clusterApiUrl("devnet"));
 
const balanceInLamports = await connection.getBalance(publicKey);
 
const balanceInSOL = balanceInLamports / LAMPORTS_PER_SOL;
 
console.log(
  `✅ Finished! The balance for the wallet at address ${publicKey} is ${balanceInSOL}!`,
);
// get funds from devnet faucet: https://faucet.solana.com/