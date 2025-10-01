"use client";

import { ReactNode } from "react";
import { Web3Provider } from "@/providers/Web3Provider";
import Navbar from "@/components/Navbar";

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <Web3Provider>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow">
          {children}
        </main>
      </div>
    </Web3Provider>
  );
}