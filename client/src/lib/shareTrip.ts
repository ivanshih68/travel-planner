/**
 * shareTrip — Generate and manage shareable trip links
 * Creates read-only access tokens for sharing trips without authentication
 */

import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";

export interface ShareLink {
  id: string;
  tripId: string;
  shareToken: string;
  createdAt: Date;
  expiresAt: Date | null;
  createdBy: string;
  isActive: boolean;
}

/**
 * Generate a unique share token
 */
function generateShareToken(): string {
  return Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
}

/**
 * Create a shareable link for a trip
 */
export async function createShareLink(
  tripId: string,
  userId: string,
  expirationDays?: number
): Promise<ShareLink> {
  try {
    const shareToken = generateShareToken();
    const now = new Date();
    const expiresAt = expirationDays
      ? new Date(now.getTime() + expirationDays * 24 * 60 * 60 * 1000)
      : null;

    const shareLink: ShareLink = {
      id: `${tripId}-${Date.now()}`,
      tripId,
      shareToken,
      createdAt: now,
      expiresAt,
      createdBy: userId,
      isActive: true,
    };

    // Save to Firestore
    await setDoc(doc(db, "shareLinks", shareLink.id), {
      ...shareLink,
      createdAt: Timestamp.fromDate(now),
      expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
    });

    return shareLink;
  } catch (error) {
    console.error("Failed to create share link:", error);
    throw error;
  }
}

/**
 * Get a shareable link by token
 */
export async function getShareLinkByToken(
  shareToken: string
): Promise<ShareLink | null> {
  try {
    const q = query(
      collection(db, "shareLinks"),
      where("shareToken", "==", shareToken),
      where("isActive", "==", true)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    const data = doc.data();

    // Check if link has expired
    if (data.expiresAt) {
      const expiresAt = data.expiresAt.toDate();
      if (new Date() > expiresAt) {
        // Deactivate expired link
        await setDoc(doc.ref, { ...data, isActive: false });
        return null;
      }
    }

    return {
      id: doc.id,
      tripId: data.tripId,
      shareToken: data.shareToken,
      createdAt: data.createdAt.toDate(),
      expiresAt: data.expiresAt ? data.expiresAt.toDate() : null,
      createdBy: data.createdBy,
      isActive: data.isActive,
    };
  } catch (error) {
    console.error("Failed to get share link:", error);
    throw error;
  }
}

/**
 * Get all share links for a trip
 */
export async function getShareLinksForTrip(tripId: string): Promise<ShareLink[]> {
  try {
    const q = query(
      collection(db, "shareLinks"),
      where("tripId", "==", tripId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        tripId: data.tripId,
        shareToken: data.shareToken,
        createdAt: data.createdAt.toDate(),
        expiresAt: data.expiresAt ? data.expiresAt.toDate() : null,
        createdBy: data.createdBy,
        isActive: data.isActive,
      };
    });
  } catch (error) {
    console.error("Failed to get share links:", error);
    throw error;
  }
}

/**
 * Deactivate a share link
 */
export async function deactivateShareLink(linkId: string): Promise<void> {
  try {
    const linkRef = doc(db, "shareLinks", linkId);
    const linkDoc = await getDoc(linkRef);

    if (linkDoc.exists()) {
      await setDoc(linkRef, { ...linkDoc.data(), isActive: false });
    }
  } catch (error) {
    console.error("Failed to deactivate share link:", error);
    throw error;
  }
}

/**
 * Delete a share link
 */
export async function deleteShareLink(linkId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "shareLinks", linkId));
  } catch (error) {
    console.error("Failed to delete share link:", error);
    throw error;
  }
}

/**
 * Generate shareable URL
 */
export function generateShareUrl(shareToken: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/share/${shareToken}`;
}

/**
 * Copy share URL to clipboard
 */
export async function copyShareUrlToClipboard(shareToken: string): Promise<void> {
  const url = generateShareUrl(shareToken);
  try {
    await navigator.clipboard.writeText(url);
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    throw error;
  }
}
