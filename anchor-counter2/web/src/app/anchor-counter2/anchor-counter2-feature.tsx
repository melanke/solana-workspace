import { useWallet } from '@solana/wallet-adapter-react';
import { ExplorerLink } from '../cluster/cluster-ui';
import { WalletButton } from '../solana/solana-provider';
import { AppHero, ellipsify } from '../ui/ui-layout';
import { useAnchorCounter2Program } from './anchor-counter2-data-access';
import {
  AnchorCounter2Create,
  AnchorCounter2Program,
} from './anchor-counter2-ui';

export default function AnchorCounter2Feature() {
  const { publicKey } = useWallet();
  const { programId } = useAnchorCounter2Program();

  return publicKey ? (
    <div>
      <AppHero
        title="AnchorCounter2"
        subtitle={'Run the program by clicking the "Run program" button.'}
      >
        <p className="mb-6">
          <ExplorerLink
            path={`account/${programId}`}
            label={ellipsify(programId.toString())}
          />
        </p>
        <AnchorCounter2Create />
      </AppHero>
      <AnchorCounter2Program />
    </div>
  ) : (
    <div className="max-w-4xl mx-auto">
      <div className="hero py-[64px]">
        <div className="hero-content text-center">
          <WalletButton className="btn btn-primary" />
        </div>
      </div>
    </div>
  );
}
