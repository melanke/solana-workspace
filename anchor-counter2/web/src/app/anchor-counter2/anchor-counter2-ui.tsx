import { Keypair, PublicKey } from '@solana/web3.js';
import { useAnchorCounter2Program, useAnchorCounter2ProgramAccount } from './anchor-counter2-data-access';

export function AnchorCounter2Create() {
  const { initialize } = useAnchorCounter2Program();

  return (
    <button
      className="btn btn-xs lg:btn-md btn-primary"
      onClick={() => initialize.mutateAsync(Keypair.generate())}
      disabled={initialize.isPending}
    >
      Initialize{initialize.isPending && '...'}
    </button>
  );
}

export function AnchorCounter2Program() {
  const { programAccount, accounts } = useAnchorCounter2Program();

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
  return accounts.data?.map((account) => (
    <CounterCard key={account.publicKey.toBase58()} account={account.publicKey} />
  ));
}

export function CounterCard({ account }: { account: PublicKey }) {
  const { accountQuery, incrementMutation, decrementMutation } = useAnchorCounter2ProgramAccount({ account });
  return (
    <div className="border-4 border-base-300 text-neutral-content rounded-xl p-4">
      <div className="flex flex-col gap-6 items-center text-center">
        <h2 className="justify-center text-3xl cursor-pointer">
          {accountQuery.data?.count.toString() ?? '0'}
        </h2>
        <div className="flex justify-around gap-4">
          <button className="btn btn-xs lg:btn-md btn-outline" onClick={() => incrementMutation.mutateAsync()}>Increment</button>
          <button className="btn btn-xs lg:btn-md btn-outline" onClick={() => decrementMutation.mutateAsync()}>Decrement</button>
        </div>
        <div className="text-center space-y-4">
          <p>{account.toBase58()}</p>
        </div>
      </div>
    </div>
  );
}
