import express from "express";
import cors from "cors";
import admin from "firebase-admin";
import { v4 as uuidv4 } from "uuid";
import { ethers } from "ethers";
import { https, logger } from "firebase-functions";

admin.initializeApp();

const db = admin.firestore();
const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// --- Authentication Endpoints ---

// GET  /auth-request?address=0xabc...
app.get("/auth-request", async (req, res) => {
  try {
    const raw = (req.query.address as string) || "";
    const address = raw.trim().toLowerCase();
    if (!address) return res.status(400).json({ error: "address query required" });

    const nonce = `Sign this nonce to authenticate: ${uuidv4()}`;

    await db.collection("walletAuthNonces").doc(address).set({
      nonce,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ nonce });
  } catch (err: any) {
    logger.error("auth-request error:", err);
    return res.status(500).json({ error: err.message || String(err) });
  }
});

// POST /auth-response
app.post("/auth-response", async (req, res) => {
  try {
    const { address: rawAddress, signature } = req.body || {};
    if (!rawAddress || !signature) return res.status(400).json({ error: "address and signature required" });

    const address = (rawAddress as string).toLowerCase();

    const doc = await db.collection("walletAuthNonces").doc(address).get();
    if (!doc.exists) return res.status(400).json({ error: "nonce not found" });

    const data = doc.data() as { nonce?: string };
    const nonce = data?.nonce;
    if (!nonce) return res.status(400).json({ error: "nonce missing" });

    let recovered: string;
    try {
      recovered = ethers.utils.verifyMessage(nonce, signature);
    } catch (e: any) {
      logger.error("verifyMessage error:", e);
      return res.status(400).json({ error: "invalid signature format" });
    }

    if (recovered.toLowerCase() !== address) {
      return res.status(401).json({ error: "signature verification failed" });
    }

    const uid = `eth:${address}`;
    const customToken = await admin.auth().createCustomToken(uid);

    await db.collection("walletAuthNonces").doc(address).delete();

    return res.json({ token: customToken });
  } catch (err: any) {
    logger.error("auth-response error:", err);
    return res.status(500).json({ error: err.message || String(err) });
  }
});


// --- NEW: Admin Dashboard Endpoint ---

/**
 * Retrieves all documents from the 'members' collection.
 * In a real app, you would protect this with admin-only authentication.
 */
app.get("/getMembers", async (req, res) => {
  try {
    const membersSnapshot = await db.collection("members").get();
    
    if (membersSnapshot.empty) {
      return res.status(200).json([]); // Return empty array if no members
    }
    
    const membersList = membersSnapshot.docs.map(doc => doc.data());
    return res.status(200).json(membersList);

  } catch (error) {
    logger.error("Error in /getMembers:", error);
    return res.status(500).json({ error: "Could not retrieve members." });
  }
});


export const api = https.onRequest(app);