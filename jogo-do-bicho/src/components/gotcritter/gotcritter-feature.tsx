"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { ExplorerLink } from "../cluster/cluster-ui";
import { WalletButton } from "../solana/solana-provider";
import { AppHero, ellipsify } from "../ui/ui-layout";
import { useGotCritterProgram } from "./gotcritter-data-access";
import { GotCritterCreate, GotCritterProgram } from "./gotcritter-ui";

export default function GotCritterFeature() {
  const { programId } = useGotCritterProgram();

  return (
    <div>
      <AppHero
        title="GotCritter"
        subtitle={"Create a game, place a bet, claim your prize"}
      >
        <p className="mb-6">
          <ExplorerLink
            path={`account/${programId}`}
            label={ellipsify(programId.toString())}
          />
        </p>
        <GotCritterCreate />
      </AppHero>
      <GotCritterProgram />
    </div>
  );
}
