"use client";

import { useMemo } from "react";
import {
  MovieReview,
  useMovieReviewProgram,
  useMovieReviewProgramAccount,
} from "./movie-review-data-access";
import { ExplorerLink } from "../cluster/cluster-ui";
import { ellipsify } from "../ui/ui-layout";
import { ProgramAccount } from "@coral-xyz/anchor";
import { quickDialogForm } from "../ui/quickDialogForm";
import Swal from "sweetalert2";

export function MovieReviewCreate() {
  const { initializeTokenMint, addMovieReview, tokenMintAccount } =
    useMovieReviewProgram();

  const handleCreate = async () => {
    const [title, description, rating] = await quickDialogForm({
      title: "Create Movie Review",
      inputs: [
        { label: "Title", type: "text" },
        { label: "Description", type: "textarea" },
        { label: "Rating", type: "number" },
      ],
    });

    addMovieReview.mutateAsync({
      title,
      description,
      rating: parseInt(rating),
    });
  };

  return (
    <div className="flex gap-4 justify-center">
      {!tokenMintAccount.data?.value ? (
        <button
          className="btn btn-xs lg:btn-md btn-primary"
          onClick={() => initializeTokenMint.mutateAsync()}
          disabled={initializeTokenMint.isPending}
        >
          Initialize token mint {initializeTokenMint.isPending && "..."}
        </button>
      ) : (
        <button
          className="btn btn-xs lg:btn-md btn-primary"
          onClick={handleCreate}
          disabled={addMovieReview.isPending}
        >
          Add movie review {addMovieReview.isPending && "..."}
        </button>
      )}
    </div>
  );
}

export function MovieReviewProgram() {
  const { accounts, programAccount } = useMovieReviewProgram();

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
      {accounts.isLoading ? (
        <span className="loading loading-spinner loading-lg"></span>
      ) : accounts.data?.length ? (
        <div className="grid md:grid-cols-2 gap-4">
          {accounts.data?.map((account) => (
            <MovieReviewCard
              key={account.publicKey.toString()}
              account={account}
            />
          ))}
        </div>
      ) : (
        <div className="text-center">
          <h2 className={"text-2xl"}>No accounts</h2>
          No accounts found. Create one above to get started.
        </div>
      )}
    </div>
  );
}

function MovieReviewCard({
  account,
}: {
  account: ProgramAccount<MovieReview>;
}) {
  const { updateMovieReview, deleteMovieReview } = useMovieReviewProgramAccount(
    {
      account,
    }
  );

  const handleUpdate = async () => {
    const [description, rating] = await quickDialogForm({
      title: "Update Movie Review",
      inputs: [
        { label: "Description", type: "textarea" },
        { label: "Rating", type: "number" },
      ],
    });

    updateMovieReview.mutateAsync({
      description,
      rating: parseInt(rating),
    });
  };

  const handleDelete = async () => {
    await Swal.fire({
      title: "Are you sure you want to delete this movie review?",
      showCancelButton: true,
      confirmButtonText: "Delete",
      showClass: {
        popup: `
          animate__animated
          animate__fadeInUp
          animate__faster
        `,
      },
      hideClass: {
        popup: `
          animate__animated
          animate__fadeOutDown
          animate__faster
        `,
      },
    });

    await deleteMovieReview.mutateAsync();
  };

  return (
    <div className="card card-bordered border-base-300 border-4 text-neutral-content">
      <div className="card-body items-center text-center">
        <div className="space-y-6">
          <h2 className="card-title justify-center text-3xl cursor-pointer">
            {account.account.title}
          </h2>
          <p>{account.account.description}</p>
          <p>{account.account.rating}</p>
          <div className="card-actions justify-around">
            <button
              className="btn btn-xs lg:btn-md btn-outline"
              onClick={handleUpdate}
              disabled={updateMovieReview.isPending}
            >
              Update
            </button>
            <button
              className="btn btn-xs lg:btn-md btn-outline"
              onClick={handleDelete}
              disabled={deleteMovieReview.isPending}
            >
              Delete
            </button>
          </div>
          <div className="text-center space-y-4">
            <p>
              <ExplorerLink
                path={`account/${account.publicKey}`}
                label={ellipsify(account.publicKey.toString())}
              />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
