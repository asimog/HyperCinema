// Promo code system - free video generations
import { getDb } from "@/lib/firebase/admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

// Promo code document schema
export interface PromoCode {
  code: string;
  isActive: boolean;
  maxUses: number;
  currentUses: number;
  expiresAt: Timestamp | null;
  allowedStyles: string[] | null;
  createdAt: Timestamp;
  createdBy: string;
  description: string;
}

// Validation result from checking code
export interface PromoCodeValidation {
  isValid: boolean;
  code: string | null;
  errorMessage: string | null;
  allowedStyles: string[] | null;
}

// Record of each code use
export interface PromoCodeUseRecord {
  code: string;
  jobId: string;
  wallet: string;
  usedAt: Timestamp;
  profileInput: string;
  style: string;
}

// Firestore collections for promo codes
const PROMO_CODES_COLLECTION = "promo_codes";
const PROMO_CODE_USES_COLLECTION = "promo_code_uses";

// Check if code is valid and active
export async function validatePromoCode(code: string): Promise<PromoCodeValidation> {
  const db = getDb();
  const normalizedCode = code.trim().toUpperCase();

  // Reject empty codes early
  if (!normalizedCode) {
    return {
      isValid: false,
      code: null,
      errorMessage: "No promo code provided",
      allowedStyles: null,
    };
  }

  try {
    const docRef = db.collection(PROMO_CODES_COLLECTION).doc(normalizedCode);
    const doc = await docRef.get();

    // Code does not exist in database
    if (!doc.exists) {
      return {
        isValid: false,
        code: normalizedCode,
        errorMessage: `Promo code "${normalizedCode}" not found`,
        allowedStyles: null,
      };
    }

    const promoCode = doc.data() as PromoCode;

    // Check if code still active
    if (!promoCode.isActive) {
      return {
        isValid: false,
        code: normalizedCode,
        errorMessage: `Promo code "${normalizedCode}" is no longer active`,
        allowedStyles: null,
      };
    }

    // Check if code expired
    if (promoCode.expiresAt && promoCode.expiresAt.toMillis() < Date.now()) {
      return {
        isValid: false,
        code: normalizedCode,
        errorMessage: `Promo code "${normalizedCode}" has expired`,
        allowedStyles: null,
      };
    }

    // Check if max uses reached
    if (promoCode.currentUses >= promoCode.maxUses) {
      return {
        isValid: false,
        code: normalizedCode,
        errorMessage: `Promo code "${normalizedCode}" has reached maximum uses`,
        allowedStyles: null,
      };
    }

    return {
      isValid: true,
      code: normalizedCode,
      errorMessage: null,
      allowedStyles: promoCode.allowedStyles,
    };
  } catch (error) {
    return {
      isValid: false,
      code: normalizedCode,
      errorMessage: `Error validating promo code: ${error instanceof Error ? error.message : "Unknown error"}`,
      allowedStyles: null,
    };
  }
}

// Redeem code - atomic increment and record
export async function usePromoCode(input: {
  code: string;
  jobId: string;
  wallet: string;
  profileInput: string;
  style: string;
}): Promise<{ success: boolean; errorMessage: string | null }> {
  const db = getDb();
  const normalizedCode = input.code.trim().toUpperCase();

  try {
    // Use transaction to atomically validate, increment, and record
    const result = await db.runTransaction(async (transaction) => {
      const docRef = db.collection(PROMO_CODES_COLLECTION).doc(normalizedCode);
      const doc = await transaction.get(docRef);

      if (!doc.exists) {
        return { success: false, errorMessage: "Promo code not found" };
      }

      const promoCode = doc.data() as PromoCode;

      // Check if active
      if (!promoCode.isActive) {
        return { success: false, errorMessage: `Promo code "${normalizedCode}" is no longer active` };
      }

      // Check expiration
      if (promoCode.expiresAt && promoCode.expiresAt.toMillis() < Date.now()) {
        return { success: false, errorMessage: `Promo code "${normalizedCode}" has expired` };
      }

      // Check max uses
      if (promoCode.currentUses >= promoCode.maxUses) {
        return { success: false, errorMessage: `Promo code "${normalizedCode}" has reached maximum uses` };
      }

      // Increment use counter AND record use atomically
      transaction.update(docRef, {
        currentUses: FieldValue.increment(1),
      });

      // Record the use inside the transaction
      const useDocRef = db.collection(PROMO_CODE_USES_COLLECTION).doc();
      transaction.set(useDocRef, {
        code: normalizedCode,
        jobId: input.jobId,
        wallet: input.wallet,
        usedAt: Timestamp.now(),
        profileInput: input.profileInput,
        style: input.style,
      } as PromoCodeUseRecord);

      return { success: true, errorMessage: null };
    });

    return result;
  } catch (error) {
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : "Failed to use promo code",
    };
  }
}

/**
 * Create a new promo code
 */
export async function createPromoCode(input: {
  code: string;
  maxUses: number;
  description: string;
  expiresAt?: Date;
  allowedStyles?: string[];
  createdBy?: string;
}): Promise<PromoCode> {
  const db = getDb();
  const normalizedCode = input.code.trim().toUpperCase();

  const promoCode: PromoCode = {
    code: normalizedCode,
    isActive: true,
    maxUses: input.maxUses,
    currentUses: 0,
    expiresAt: input.expiresAt ? Timestamp.fromDate(input.expiresAt) : null,
    allowedStyles: input.allowedStyles || null,
    createdAt: Timestamp.now(),
    createdBy: input.createdBy || "system",
    description: input.description,
  };

  await db.collection(PROMO_CODES_COLLECTION).doc(normalizedCode).set(promoCode);

  return promoCode;
}

/**
 * Deactivate a promo code
 */
export async function deactivatePromoCode(code: string): Promise<void> {
  const db = getDb();
  const normalizedCode = code.trim().toUpperCase();

  await db.collection(PROMO_CODES_COLLECTION).doc(normalizedCode).update({
    isActive: false,
  });
}

/**
 * List all promo codes
 */
export async function listPromoCodes(limit?: number): Promise<PromoCode[]> {
  const db = getDb();
  const queryLimit = limit || 100;

  const snapshot = await db
    .collection(PROMO_CODES_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(queryLimit)
    .get();

  return snapshot.docs.map((doc) => doc.data() as PromoCode);
}

/**
 * Get promo code usage stats
 */
export async function getPromoCodeStats(code: string): Promise<{
  code: PromoCode | null;
  uses: PromoCodeUseRecord[];
}> {
  const db = getDb();
  const normalizedCode = code.trim().toUpperCase();

  const docRef = db.collection(PROMO_CODES_COLLECTION).doc(normalizedCode);
  const doc = await docRef.get();

  const promoCode = doc.exists ? (doc.data() as PromoCode) : null;

  const usesSnapshot = await db
    .collection(PROMO_CODE_USES_COLLECTION)
    .where("code", "==", normalizedCode)
    .orderBy("usedAt", "desc")
    .limit(50)
    .get();

  const uses = usesSnapshot.docs.map((doc) => doc.data() as PromoCodeUseRecord);

  return {
    code: promoCode,
    uses,
  };
}

/**
 * Get default promo codes (pre-seeded codes for common use)
 */
export function getDefaultPromoCodes(): Array<{
  code: string;
  maxUses: number;
  description: string;
}> {
  return [
    {
      code: "MYTHX-FREE",
      maxUses: 100,
      description: "Free MythX video generation - 100 uses",
    },
    {
      code: "ELIZA-VIP",
      maxUses: 50,
      description: "VIP access for ElizaOS community - 50 uses",
    },
    {
      code: "CINEMA-TRIAL",
      maxUses: 200,
      description: "Trial code for new users - 200 uses",
    },
    {
      code: "AUTOCINE-2026",
      maxUses: 1000,
      description: "Launch promo - 1000 free generations",
    },
  ];
}

/**
 * Initialize default promo codes if they don't exist
 */
export async function initializeDefaultPromoCodes(): Promise<void> {
  const defaultCodes = getDefaultPromoCodes();

  for (const code of defaultCodes) {
    try {
      const db = getDb();
      const docRef = db.collection(PROMO_CODES_COLLECTION).doc(code.code);
      const doc = await docRef.get();

      if (!doc.exists) {
        await createPromoCode({
          code: code.code,
          maxUses: code.maxUses,
          description: code.description,
          createdBy: "system-default",
        });
      }
    } catch (error) {
      console.warn(`Failed to initialize default promo code ${code.code}:`, error);
    }
  }
}
