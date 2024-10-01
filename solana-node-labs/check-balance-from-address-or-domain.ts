import { clusterApiUrl, Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { getDomainKey, NameRegistryState, getAllDomains, performReverseLookup, getDomainKeySync } from "@bonfida/spl-name-service";
 
const suppliedPublicKey = process.argv[2]; // Bp45u6whcYadT8bGuBv334cKfreEfdSJ72muaVRaLKMw OR toly.sol
if (!suppliedPublicKey) {
  throw new Error("Provide a public key to check the balance of!");
}

const isDomain = suppliedPublicKey.includes(".");
 
const connection = new Connection(clusterApiUrl("mainnet-beta"));

const publicKey = isDomain ? await getPublicKeyFromSolDomain(suppliedPublicKey) : new PublicKey(suppliedPublicKey);

if (!PublicKey.isOnCurve(publicKey)) {
  throw new Error("Invalid public key");
}
 
const balanceInLamports = await connection.getBalance(publicKey);
 
const balanceInSOL = balanceInLamports / LAMPORTS_PER_SOL;
 
console.log(
  `✅ Finished! The balance for the wallet at address ${publicKey} is ${balanceInSOL}!`,
);
// get funds from devnet faucet: https://faucet.solana.com/

async function getPublicKeyFromSolDomain(domain: string):Promise<PublicKey>{
  const { pubkey } = getDomainKeySync(domain);
  const owner = (await NameRegistryState.retrieve(connection, pubkey)).registry.owner;
  console.log(`The owner of SNS Domain: ${domain} is: `, owner.toBase58());
  return owner;
}