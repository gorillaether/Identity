"use client";

import { useState } from 'react';
import { uploadTierImages } from '@/utils/ipfsUtils';

interface TierImageState {
  Basic: string | null;
  Premium: string | null;
  VIP: string | null;
}

export default function TierImageUploader() {
  const [tierImages, setTierImages] = useState<TierImageState>({
    Basic: null,
    Premium: null,
    VIP: null
  });
  const [uploadingTier, setUploadingTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = async (tier: keyof TierImageState, file: File) => {
    setUploadingTier(tier);
    setError(null);

    try {
      console.log(`Uploading ${tier} tier image:`, file.name);
      
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file');
      }
      
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image must be smaller than 5MB');
      }

      const ipfsHash = await uploadTierImages(file, tier);
      
      setTierImages(prev => ({
        ...prev,
        [tier]: ipfsHash
      }));

      console.log(`${tier} tier image uploaded successfully:`, ipfsHash);
      
    } catch (err) {
      console.error(`Error uploading ${tier} image:`, err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingTier(null);
    }
  };

  const handleFileChange = (tier: keyof TierImageState, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(tier, file);
    }
  };

  const copyToClipboard = (hash: string) => {
    navigator.clipboard.writeText(hash);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-semibold mb-4 text-mahogany">Tier Image Management</h2>
      <p className="text-gray-600 mb-6">
        Upload images for each membership tier. These will be used in NFT metadata.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(Object.keys(tierImages) as Array<keyof TierImageState>).map((tier) => (
          <div key={tier} className="border rounded-lg p-4">
            <h3 className={`text-lg font-semibold mb-3 ${
              tier === 'Basic' ? 'text-blue-600' :
              tier === 'Premium' ? 'text-yellow-600' :
              'text-purple-600'
            }`}>
              {tier} Tier
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(tier, e)}
                disabled={uploadingTier === tier}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {uploadingTier === tier && (
              <div className="mb-4 text-center">
                <div className="text-sm text-gray-600">Uploading to IPFS...</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse w-full"></div>
                </div>
              </div>
            )}

            {tierImages[tier] && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">IPFS Hash:</div>
                <div className="font-mono text-xs break-all mb-2">
                  {tierImages[tier]}
                </div>
                <button
                  onClick={() => copyToClipboard(tierImages[tier]!)}
                  className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
                >
                  Copy Hash
                </button>
              </div>
            )}

            {!tierImages[tier] && uploadingTier !== tier && (
              <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                No image uploaded
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold mb-2">Upload Progress</h4>
        <div className="text-sm space-y-1">
          {Object.entries(tierImages).map(([tier, hash]) => (
            <div key={tier} className="flex justify-between">
              <span>{tier}:</span>
              <span className={hash ? 'text-green-600' : 'text-gray-400'}>
                {hash ? '✓ Uploaded' : '○ Pending'}
              </span>
            </div>
          ))}
        </div>
        
        {Object.values(tierImages).every(hash => hash !== null) && (
          <div className="mt-3 p-2 bg-green-100 text-green-800 rounded text-sm">
            All tier images uploaded! NFT minting will now use these images.
          </div>
        )}
      </div>
    </div>
  );
}