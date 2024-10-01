import { airdropIfRequired } from "@solana-developers/helpers";
import { clusterApiUrl, Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
 
const suppliedPublicKey = process.argv[2]; // Bp45u6whcYadT8bGuBv334cKfreEfdSJ72muaVRaLKMw
if (!suppliedPublicKey) {
  throw new Error("Provide a public key to get funds!");
}
 
const publicKey = new PublicKey(suppliedPublicKey);

if (!PublicKey.isOnCurve(publicKey)) {
  throw new Error("Invalid public key");
}
 
const connection = new Connection(clusterApiUrl("devnet"));

await airdropIfRequired(
    connection,
    publicKey,
    1 * LAMPORTS_PER_SOL,
    0.5 * LAMPORTS_PER_SOL,
);

console.log(`✅ Finished! Airdropped 1 SOL to ${publicKey}`);

// You can also use https://faucet.solana.com/