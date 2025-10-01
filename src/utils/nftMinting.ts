import { ethers } from 'ethers';
import SoulboundABI from '@/lib/Soulbound.abi.json';
import { createMembershipMetadata } from '@/utils/ipfsUtils';

// Your deployed Soulbound contract address
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;

export interface MintResult {
  success: boolean;
  tokenId?: number;
  transactionHash?: string;
  error?: string;
}

/**
 * Mint a Soulbound NFT to a member's wallet with rich IPFS metadata
 */
export const mintMembershipNFT = async (
  memberWallet: string,
  memberName: string,
  accessTier: string,
  signer: ethers.Signer
): Promise<MintResult> => {
  try {
    console.log("Starting NFT mint for:", memberWallet);
    
    // Create contract instance
    const contract = new ethers.Contract(CONTRACT_ADDRESS, SoulboundABI, signer);
    
    console.log("Generating rich IPFS metadata...");
    
    // Generate and upload rich metadata to IPFS
    const tokenURI = await createMembershipMetadata(memberName, accessTier, memberWallet);
    
    console.log("IPFS metadata created:", tokenURI);
    
    // Estimate gas first
    const gasEstimate = await contract.estimateGas.mint(memberWallet, tokenURI);
    const gasLimit = gasEstimate.mul(120).div(100); // Add 20% buffer
    
    console.log("Estimated gas:", gasEstimate.toString());
    
    // Call the mint function with IPFS metadata
    const transaction = await contract.mint(memberWallet, tokenURI, {
      gasLimit
    });
    
    console.log("Transaction sent:", transaction.hash);
    
    // Wait for transaction confirmation
    const receipt = await transaction.wait();
    
    if (receipt.status === 1) {
      // Extract token ID from the transaction logs
      let tokenId;
      
      // Look for SoulboundMinted event
      const soulboundMintedEvent = receipt.events?.find(
        (event: any) => event.event === 'SoulboundMinted'
      );
      
      if (soulboundMintedEvent) {
        tokenId = soulboundMintedEvent.args?.tokenId?.toNumber();
      } else {
        // Fallback: parse from transaction receipt logs
        const mintInterface = new ethers.utils.Interface([
          "event SoulboundMinted(address indexed to, uint256 indexed tokenId, string tokenURI)"
        ]);
        
        for (const log of receipt.logs) {
          try {
            const parsed = mintInterface.parseLog(log);
            if (parsed.name === 'SoulboundMinted') {
              tokenId = parsed.args.tokenId.toNumber();
              break;
            }
          } catch (e) {
            // Skip logs that don't match our interface
          }
        }
      }
      
      console.log("NFT minted successfully with rich metadata. Token ID:", tokenId);
      console.log("Token URI:", tokenURI);
      
      return {
        success: true,
        tokenId,
        transactionHash: receipt.transactionHash
      };
    } else {
      throw new Error("Transaction failed");
    }
    
  } catch (error: any) {
    console.error("Error minting NFT:", error);
    console.error("Error details:", {
      code: error.code,
      message: error.message,
      data: error.data,
      reason: error.reason
    });
    
    let errorMessage = "Failed to mint NFT";
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      errorMessage = "Insufficient funds to pay for gas";
    } else if (error.code === 'USER_REJECTED') {
      errorMessage = "Transaction rejected by user";
    } else if (error.code === -32603) {
      errorMessage = "Internal JSON-RPC error - check contract address and network";
    } else if (error.message?.includes('execution reverted')) {
      errorMessage = `Contract execution failed: ${error.reason || error.message}`;
    } else if (error.message?.includes('IPFS') || error.message?.includes('Pinata')) {
      errorMessage = `IPFS upload failed: ${error.message}`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Check if a wallet already has a membership NFT
 */
export const checkMembershipNFT = async (
  memberWallet: string,
  provider: ethers.providers.Provider
): Promise<number | null> => {
  try {
    const contract = new ethers.Contract(CONTRACT_ADDRESS, SoulboundABI, provider);
    const balance = await contract.balanceOf(memberWallet);
    
    if (balance.gt(0)) {
      return balance.toNumber();
    }
    
    return null;
  } catch (error) {
    console.error("Error checking membership NFT:", error);
    return null;
  }
};

/**
 * Check if the connected wallet has MINTER_ROLE permissions
 */
export const checkMinterRole = async (
  walletAddress: string,
  provider: ethers.providers.Provider
): Promise<boolean> => {
  try {
    const contract = new ethers.Contract(CONTRACT_ADDRESS, SoulboundABI, provider);
    const minterRole = await contract.MINTER_ROLE();
    const hasMinterRole = await contract.hasRole(minterRole, walletAddress);
    return hasMinterRole;
  } catch (error) {
    console.error("Error checking minter role:", error);
    return false;
  }
};