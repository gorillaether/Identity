interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

interface MemberMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties: {
    category: string;
    tier_color: string;
    access_expires: string | null;
  };
}

/**
 * Generate tier-specific metadata for a member
 */
export function generateMemberMetadata(
  memberName: string,
  accessTier: string,
  walletAddress: string
): MemberMetadata {
  const tierConfig = getTierConfig(accessTier);
  
  return {
    name: `MemberGate Pro - ${accessTier} Member`,
    description: `${accessTier} membership for ${memberName}. ${tierConfig.description}`,
    image: tierConfig.imageIPFS,
    attributes: [
      { trait_type: "Tier", value: accessTier },
      { trait_type: "Member Name", value: memberName },
      { trait_type: "Access Level", value: tierConfig.accessLevel },
      { trait_type: "Support Priority", value: tierConfig.support },
      { trait_type: "Member Since", value: new Date().getFullYear().toString() },
      { trait_type: "Wallet", value: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` }
    ],
    properties: {
      category: "Membership",
      tier_color: tierConfig.color,
      access_expires: null
    }
  };
}

/**
 * Get configuration for each tier
 */
function getTierConfig(tier: string) {
  const configs = {
    Basic: {
      description: "Standard access to core platform features and community.",
      accessLevel: "Standard",
      support: "Standard",
      color: "#3B82F6",
      imageIPFS: "ipfs://bafybeig5qohu3wnzjz52n4sselon25kl7rzrluchfh3egg7sgjrmetwg3u"
    },
    Premium: {
      description: "Enhanced features with priority support and exclusive content.",
      accessLevel: "Enhanced", 
      support: "Priority",
      color: "#F59E0B",
      imageIPFS: "ipfs://bafybeiewsgvu6e5iqhqqjyenmwuo4grbl2ksbdbdtsv6wdfqkoy4i7pkdy"
    },
    VIP: {
      description: "Full platform access with 1-on-1 consultations and early feature access.",
      accessLevel: "Full",
      support: "VIP",
      color: "#9333EA",
      imageIPFS: "ipfs://bafybeidvof7n4ht2lhyyae7oryix6nxumpdaedwtucpj7pdhv3cstq35ru"
    }
  };

  return configs[tier as keyof typeof configs] || configs.Basic;
}

/**
 * Upload metadata JSON to Pinata IPFS
 */
export async function uploadMetadataToPinata(metadata: MemberMetadata): Promise<string> {
  const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT;
  
  if (!PINATA_JWT) {
    throw new Error("PINATA_JWT environment variable not set");
  }

  try {
    const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PINATA_JWT}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: {
          name: `MemberGate-${metadata.attributes.find(attr => attr.trait_type === "Member Name")?.value}-${Date.now()}`
        },
        pinataOptions: {
          cidVersion: 1
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Pinata upload failed: ${errorData.error || response.statusText}`);
    }

    const data: PinataResponse = await response.json();
    console.log("Metadata uploaded to IPFS:", `ipfs://${data.IpfsHash}`);
    
    return `ipfs://${data.IpfsHash}`;
  } catch (error) {
    console.error("Error uploading to Pinata:", error);
    throw error;
  }
}

/**
 * Upload tier-specific images to IPFS
 */
export async function uploadTierImages(imageFile: File, tierName: string): Promise<string> {
  const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT;
  
  if (!PINATA_JWT) {
    throw new Error("PINATA_JWT environment variable not set");
  }

  const formData = new FormData();
  formData.append("file", imageFile);
  formData.append("pinataMetadata", JSON.stringify({
    name: `MemberGate-${tierName}-Image`
  }));
  formData.append("pinataOptions", JSON.stringify({
    cidVersion: 1
  }));

  try {
    const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PINATA_JWT}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Image upload failed: ${errorData.error || response.statusText}`);
    }

    const data: PinataResponse = await response.json();
    const ipfsURI = `ipfs://${data.IpfsHash}`;
    console.log(`${tierName} image uploaded:`, ipfsURI);
    
    return ipfsURI;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
}

/**
 * Create a complete membership NFT with IPFS metadata
 */
export async function createMembershipMetadata(
  memberName: string,
  accessTier: string,
  walletAddress: string
): Promise<string> {
  try {
    console.log("Generating metadata for:", memberName, accessTier);
    
    const metadata = generateMemberMetadata(memberName, accessTier, walletAddress);
    const ipfsURI = await uploadMetadataToPinata(metadata);
    
    console.log("Member metadata created:", ipfsURI);
    return ipfsURI;
    
  } catch (error) {
    console.error("Error creating membership metadata:", error);
    throw error;
  }
}