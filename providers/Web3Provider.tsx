"use client";

import { ReactNode, useState } from "react";
import { WagmiProvider } from "wagmi";
import { mainnet, goerli, polygonAmoy } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";

interface Props {
  children: ReactNode;
}

// Create wagmi config outside component (this is fine)
const config = getDefaultConfig({
  appName: "Identity DApp",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [mainnet, goerli, polygonAmoy],
  transports: {
    [mainnet.id]: http(`https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY}`),
    [goerli.id]: http(`https://eth-goerli.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY}`),
    [polygonAmoy.id]: http(process.env.NEXT_PUBLIC_POLYGON_RPC),
  },
});

export function Web3Provider({ children }: Props) {
  // Create QueryClient INSIDE component using useState
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}