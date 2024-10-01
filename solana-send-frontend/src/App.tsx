import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import React, { useState } from 'react'
import { toast } from 'react-toastify'

function App() {
  const { connection } = useConnection()
  const { publicKey: fromPubkey, sendTransaction } = useWallet()

  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [signature, setSignature] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!connection || !fromPubkey) {
      toast.error('Wallet not connected or connection unavailable')
      return
    }

    try {
      setLoading(true)
      const toPubkey = new PublicKey(recipient)
      const transaction = new Transaction()
      const lamports = Number(amount) * LAMPORTS_PER_SOL

      const sendSolInstruction = SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports,
      })

      transaction.add(sendSolInstruction)

      const signature = await sendTransaction(transaction, connection)
      setSignature(signature)
    } catch (error) {
      toast.error(`Transaction failed: ${error}`)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setSignature('')
    setRecipient('')
    setAmount('')
  }

  return (
    <div className="w-full h-screen flex flex-col items-center">
      <div className="container flex items-center justify-between p-2">
        <h1 className="text-2xl font-bold">Solana Send</h1>
        <WalletMultiButton />
      </div>
      <div className="container flex flex-col flex-grow m-2 p-2 items-center justify-center bg-neutral-100 rounded-3xl">
        {!connection || !fromPubkey ? (
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-xl font-bold">Connect your wallet</h2>
            <WalletMultiButton />
          </div>
        ) : signature ? (
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-xl font-bold">Transaction sent</h2>
            <a href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`} className="text-blue-500 underline" target="_blank" rel="noopener noreferrer">View on Explorer</a>
            <button className='bg-blue-500 text-white p-2 rounded-md' onClick={reset}>Send another</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-96 flex flex-col gap-2 bg-white rounded-2xl p-8">
            <h2 className="text-xl font-bold">Send SOL</h2>
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              type="text"
              className="w-full p-2 border border-neutral-200 rounded-md"
              placeholder="Enter recipient's public key"
              disabled={loading}
            />
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="text"
              className="w-full p-2 border border-neutral-200 rounded-md"
              placeholder="Enter amount of SOL"
              disabled={loading}
            />
            <button className="w-full p-2 bg-blue-500 text-white rounded-md" disabled={loading}>{loading ? 'Sending...' : 'Send'}</button>
          </form>
        )}
      </div>
    </div>
  )
}

export default App
