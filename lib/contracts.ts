import { Address } from "viem";
import SoulboundAbi from "./Soulbound.abi.json";

export const soulboundContract = {
  address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as Address,
  abi: SoulboundAbi,
};