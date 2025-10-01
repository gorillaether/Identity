"use client";

import { useState, useEffect } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { ethers } from 'ethers';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { mintMembershipNFT, checkMinterRole, type MintResult } from '@/utils/nftMinting';
import TierImageUploader from '@/components/TierImageUploader';

interface Member {
  walletAddress: string;
  clientName: string;
  accessTier: string;
  nftMinted: boolean;
  tokenId?: number;
  transactionHash?: string;
  createdAt?: any;
  id?: string;
}

interface NewMemberForm {
  walletAddress: string;
  clientName: string;
  accessTier: string;
}

export default function AdminDashboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mintingTokens, setMintingTokens] = useState<Set<string>>(new Set());
  const [hasMinterRole, setHasMinterRole] = useState(false);
  const [formData, setFormData] = useState<NewMemberForm>({
    walletAddress: '',
    clientName: '',
    accessTier: 'Basic'
  });

  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  console.log("AdminDashboard component loaded with NFT minting capability");

  // Check if connected wallet has minter role
  useEffect(() => {
    const checkMinterPermissions = async () => {
      if (address && typeof window !== 'undefined' && window.ethereum) {
        try {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const canMint = await checkMinterRole(address, provider);
          setHasMinterRole(canMint);
          console.log("Minter role check:", canMint);
        } catch (error) {
          console.error("Error checking minter role:", error);
        }
      }
    };

    checkMinterPermissions();
  }, [address]);

  // Fetch members from Firestore
  const fetchMembers = async () => {
    try {
      console.log("Fetching members from Firestore...");
      const querySnapshot = await getDocs(collection(db, 'members'));
      if (querySnapshot.empty) {
        console.log("No members found in Firestore");
        setMembers([]);
      } else {
        const membersList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Member));
        console.log("Fetched members:", membersList);
        setMembers(membersList);
      }
    } catch (err) {
      console.error("Error fetching members:", err);
      setError("Failed to fetch members from Firebase");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      console.log("Adding new member to Firestore:", formData);
      // Check if wallet address already exists
      const existingMember = members.find(
        member => member.walletAddress.toLowerCase() === formData.walletAddress.toLowerCase()
      );
      if (existingMember) {
        throw new Error("A member with this wallet address already exists");
      }
      // Add member to Firestore
      const memberData = {
        walletAddress: formData.walletAddress.toLowerCase(),
        clientName: formData.clientName.trim(),
        accessTier: formData.accessTier,
        nftMinted: false,
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'members'), memberData);
      console.log("Member added with ID:", docRef.id);
      // Reset form and close modal
      setFormData({
        walletAddress: '',
        clientName: '',
        accessTier: 'Basic'
      });
      setShowAddForm(false);
      // Refresh the member list
      await fetchMembers();
      console.log("Member added successfully");
    } catch (err) {
      console.error("Error adding member:", err);
      setError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMintNFT = async (member: Member) => {
    if (!walletClient || !member.id) {
      setError("Wallet not connected or member ID missing");
      return;
    }

    setMintingTokens(prev => new Set(prev).add(member.id!));
    setError(null);

    try {
      console.log("Starting NFT mint for member:", member.clientName);

      // Convert wallet client to ethers signer
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      const result: MintResult = await mintMembershipNFT(
        member.walletAddress,
        member.clientName,
        member.accessTier,
        signer
      );

      if (result.success) {
        // Update member in Firestore
        const memberRef = doc(db, 'members', member.id);
        await updateDoc(memberRef, {
          nftMinted: true,
          tokenId: result.tokenId,
          transactionHash: result.transactionHash,
          mintedAt: serverTimestamp()
        });

        console.log("Member updated in Firestore with NFT info");
        // Refresh member list
        await fetchMembers();

        // Show success message
        setError(null);
      } else {
        throw new Error(result.error || "Minting failed");
      }

    } catch (err) {
      console.error("Error minting NFT:", err);
      setError(err instanceof Error ? err.message : 'Failed to mint NFT');
    } finally {
      setMintingTokens(prev => {
        const newSet = new Set(prev);
        newSet.delete(member.id!);
        return newSet;
      });
    }
  };

  const validateWalletAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const isFormValid = () => {
    return (
      formData.walletAddress.trim() !== '' &&
      validateWalletAddress(formData.walletAddress) &&
      formData.clientName.trim() !== '' &&
      formData.accessTier !== ''
    );
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="text-lg">Loading members from Firebase...</div>
        <div className="text-sm text-gray-500 mt-2">Connecting to Firestore database</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TierImageUploader />

      {/* Add Member Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-mahogany">Member Management</h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
          >
            {showAddForm ? 'Cancel' : 'Add New Member'}
          </button>
        </div>

        {/* Add Member Form */}
        {showAddForm && (
          <form onSubmit={handleSubmit} className="border-t pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="walletAddress" className="block text-sm font-medium text-gray-700 mb-1">
                  Wallet Address *
                </label>
                <input
                  type="text"
                  id="walletAddress"
                  name="walletAddress"
                  value={formData.walletAddress}
                  onChange={handleInputChange}
                  placeholder="0x..."
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formData.walletAddress && !validateWalletAddress(formData.walletAddress)
                      ? 'border-red-500'
                      : 'border-gray-300'
                  }`}
                  required
                />
                {formData.walletAddress && !validateWalletAddress(formData.walletAddress) && (
                  <p className="text-red-500 text-sm mt-1">Please enter a valid Ethereum address</p>
                )}
              </div>

              <div>
                <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-1">
                  Client/Member Name *
                </label>
                <input
                  type="text"
                  id="clientName"
                  name="clientName"
                  value={formData.clientName}
                  onChange={handleInputChange}
                  placeholder="Enter full name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="accessTier" className="block text-sm font-medium text-gray-700 mb-1">
                Access Tier *
              </label>
              <select
                id="accessTier"
                name="accessTier"
                value={formData.accessTier}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="Basic">Basic - Standard Access</option>
                <option value="Premium">Premium - Enhanced Features</option>
                <option value="VIP">VIP - Full Access</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isFormValid() || isSubmitting}
                className={`px-6 py-2 rounded-lg font-medium ${
                  isFormValid() && !isSubmitting
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? 'Adding to Firebase...' : 'Add Member'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Members List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-mahogany">Current Members</h3>
          <button
            onClick={fetchMembers}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Refresh List
          </button>
        </div>
        <div className="mb-4 text-sm text-gray-600">
          Total members: {members.length} | NFTs minted: {members.filter(m => m.nftMinted).length}
        </div>
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="p-2">Wallet Address</th>
                <th className="p-2">Member Name</th>
                <th className="p-2">Access Tier</th>
                <th className="p-2">NFT Status</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.length > 0 ? (
                members.map((member) => (
                  <tr key={member.id || member.walletAddress} className="border-b border-gray-100">
                    <td className="p-2 text-sm font-mono">
                      <span title={member.walletAddress}>
                        {member.walletAddress.slice(0, 6)}...{member.walletAddress.slice(-4)}
                      </span>
                    </td>
                    <td className="p-2">{member.clientName}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        member.accessTier === 'VIP' ? 'bg-purple-100 text-purple-800' :
                        member.accessTier === 'Premium' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {member.accessTier}
                      </span>
                    </td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        member.nftMinted 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {member.nftMinted ? `Minted #${member.tokenId}` : 'Pending'}
                      </span>
                    </td>
                    <td className="p-2">
                      {!member.nftMinted && (
                        <button 
                          onClick={() => handleMintNFT(member)}
                          disabled={mintingTokens.has(member.id || '')}
                          className={`px-3 py-1 rounded text-sm ${
                            !mintingTokens.has(member.id || '')
                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {mintingTokens.has(member.id || '') ? 'Minting...' : 'Mint NFT'}
                        </button>
                      )}
                      {member.nftMinted && member.transactionHash && (
                        <a
                          href={`https://polygonscan.com/tx/${member.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-800 text-sm underline"
                        >
                          View TX
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center p-8">
                    <div className="text-gray-500">
                      <p className="text-lg mb-2">No members found in Firebase</p>
                      <p className="text-sm">Click "Add New Member" to add your first member</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}