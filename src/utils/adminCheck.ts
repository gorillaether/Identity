/**
 * Utility to check if a wallet address has admin privileges
 */

export const isAdminWallet = (walletAddress: string | undefined): boolean => {
    if (!walletAddress) return false;
    
    const adminWallets = process.env.NEXT_PUBLIC_ADMIN_WALLETS?.split(',') || [];
    
    // Normalize addresses to lowercase for comparison
    const normalizedWallet = walletAddress.toLowerCase();
    const normalizedAdminWallets = adminWallets.map(addr => addr.trim().toLowerCase());
    
    return normalizedAdminWallets.includes(normalizedWallet);
  };
  
  /**
   * Get list of all admin wallet addresses
   */
  export const getAdminWallets = (): string[] => {
    return process.env.NEXT_PUBLIC_ADMIN_WALLETS?.split(',').map(addr => addr.trim()) || [];
  };
  
  /**
   * Check if any admin wallets are configured
   */
  export const hasAdminWallets = (): boolean => {
    return getAdminWallets().length > 0;
  };