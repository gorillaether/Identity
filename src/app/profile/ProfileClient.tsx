"use client";

import { useState, useEffect } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { auth } from "@/lib/firebase";
import {
  signInWithCustomToken,
  onAuthStateChanged,
  User,
  signOut,
} from "firebase/auth";
import ConnectWallet from "@/components/ConnectWallet";

const API_BASE_URL = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL;

export default function ProfileClient() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    if (!address || !signMessageAsync) return;

    setIsLoading(true);
    setError(null);

    try {
      // Request nonce from Firebase Function
      const resNonce = await fetch(
        `${API_BASE_URL}/auth-request?address=${address}`
      );
      if (!resNonce.ok) throw new Error("Failed to fetch nonce.");
      const { nonce } = await resNonce.json();

      // Sign nonce with wallet
      const signature = await signMessageAsync({ message: nonce });

      // Send signature to Firebase Function for verification
      const resToken = await fetch(`${API_BASE_URL}/auth-response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature }),
      });

      if (!resToken.ok) {
        let errorMsg = "Signature verification failed.";
        try {
          const errJson = await resToken.json();
          errorMsg = errJson.error || errorMsg;
        } catch {
          errorMsg = await resToken.text();
        }
        throw new Error(errorMsg);
      }

      // Sign in to Firebase with custom token
      const { token } = await resToken.json();
      await signInWithCustomToken(auth, token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center pt-4 text-center">
        <p className="mb-4">Connect your wallet to begin.</p>
        <ConnectWallet />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4 text-center">
        <div className="break-words">
          <strong className="font-serif">Wallet Connected:</strong>
          <p className="text-sm">{address}</p>
        </div>
        <button
          onClick={handleSignIn}
          disabled={isLoading}
          className="w-full btn-primary"
        >
          {isLoading ? "Authenticating..." : "Authenticate with Wallet"}
        </button>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center">
      <p className="font-bold text-green-700">Successfully Authenticated ✅</p>
      <div className="break-words">
        <strong className="font-serif">Firebase UID:</strong>
        <p className="text-sm">{user.uid}</p>
      </div>
      <button
        onClick={handleSignOut}
        className="w-full btn-primary !bg-red-600"
      >
        Sign Out
      </button>
    </div>
  );
}