/**
 * FHEVM SDK Wrapper
 * Uses @zama-fhe/relayer-sdk v0.3.0
 */

import type { FhevmInstance } from "@zama-fhe/relayer-sdk/web";
import { getAddress } from "viem";

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

/**
 * Convert address to EIP-55 checksum format
 */
function toChecksumAddress(address: string): string {
  try {
    return getAddress(address);
  } catch {
    // If viem fails, return original
    return address;
  }
}

let fhevmInstance: FhevmInstance | null = null;
let isInitializing = false;
let initPromise: Promise<FhevmInstance | null> | null = null;
let initError: string | null = null;

/**
 * Initialize FHEVM SDK with official SepoliaConfig
 */
export async function initializeFhevm(): Promise<FhevmInstance | null> {
  if (typeof window === "undefined") {
    return null;
  }

  if (fhevmInstance) {
    return fhevmInstance;
  }

  if (isInitializing && initPromise) {
    return initPromise;
  }

  isInitializing = true;

  initPromise = (async () => {
    try {
      const { initSDK, createInstance, SepoliaConfig } = await import("@zama-fhe/relayer-sdk/web");
      
      // Initialize the SDK (loads WASM modules)
      await initSDK();
      
      // Use official SepoliaConfig with user's provider
      const config = {
        ...SepoliaConfig,
        network: typeof window !== "undefined" && window.ethereum 
          ? window.ethereum 
          : SepoliaConfig.network,
      };
      
      console.log("🔧 Using official SepoliaConfig v0.3:", {
        relayerUrl: config.relayerUrl,
        gatewayChainId: config.gatewayChainId,
        aclContractAddress: config.aclContractAddress,
      });
      
      // Create instance
      fhevmInstance = await createInstance(config);
      
      console.log("✅ FHEVM SDK v0.3 initialized successfully");
      initError = null;
      return fhevmInstance;
    } catch (error: any) {
      console.error("Failed to initialize FHEVM:", error);
      initError = error?.message || String(error);
      isInitializing = false;
      initPromise = null;
      return null;
    }
  })();

  return initPromise;
}

export function getFhevmInstance(): FhevmInstance | null {
  return fhevmInstance;
}

export function getInitError(): string | null {
  return initError;
}

export interface EncryptedInput {
  handle: string;
  inputProof: string;
}

/**
 * Convert Uint8Array to hex string
 */
function toHexString(bytes: Uint8Array): string {
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Encrypt a value for use as einput in contract calls
 * @param value - The value to encrypt (0 or 1 for voting)
 * @param contractAddress - The contract that will receive the encrypted value
 * @param userAddress - The user's address
 */
export async function encryptValue(
  value: number,
  contractAddress: string,
  userAddress: string
): Promise<EncryptedInput | null> {
  const instance = getFhevmInstance();
  if (!instance) {
    console.error("FHEVM SDK not initialized");
    return null;
  }

  // Convert addresses to checksum format (EIP-55)
  const checksumContract = toChecksumAddress(contractAddress);
  const checksumUser = toChecksumAddress(userAddress);

  try {
    const input = instance.createEncryptedInput(checksumContract, checksumUser);
    input.add64(value); // Use add64 for euint64
    const encrypted = await input.encrypt();
    
    // Convert Uint8Array to hex strings for wagmi
    const handle = encrypted.handles[0];
    const handleHex = handle instanceof Uint8Array ? toHexString(handle) : handle;
    const proofHex = encrypted.inputProof instanceof Uint8Array 
      ? toHexString(encrypted.inputProof) 
      : encrypted.inputProof;
    
    console.log("📦 Encrypted input:", { handleHex, proofLength: proofHex.length });
    
    return {
      handle: handleHex,
      inputProof: proofHex,
    };
  } catch (error) {
    console.error("Encryption failed:", error);
    return null;
  }
}

export interface DecryptionResult {
  success: boolean;
  value?: bigint;
  error?: string;
}

/**
 * Request user decryption with EIP-712 signature (single handle)
 * @param handle - The encrypted value handle
 * @param contractAddress - The contract that owns the encrypted value
 * @param userAddress - The user requesting decryption
 * @param signTypedData - Function to sign EIP-712 message
 * @param maxRetries - Maximum retry attempts (default: 3)
 */
export async function requestUserDecryption(
  handle: string,
  contractAddress: string,
  userAddress: string,
  signTypedData: (params: any) => Promise<string>,
  maxRetries: number = 3
): Promise<DecryptionResult> {
  const results = await requestBatchUserDecryption(
    [handle],
    contractAddress,
    userAddress,
    signTypedData,
    maxRetries
  );
  
  if (!results.success) {
    return { success: false, error: results.error };
  }
  
  const value = results.values?.[handle];
  if (typeof value === "bigint") {
    return { success: true, value };
  }
  
  return { success: false, error: "Decryption failed for handle" };
}

export interface BatchDecryptionResult {
  success: boolean;
  values?: Record<string, bigint>;
  error?: string;
}

/**
 * Request batch user decryption with single EIP-712 signature
 * @param handles - Array of encrypted value handles
 * @param contractAddress - The contract that owns the encrypted values
 * @param userAddress - The user requesting decryption
 * @param signTypedData - Function to sign EIP-712 message
 * @param maxRetries - Maximum retry attempts (default: 3)
 */
export async function requestBatchUserDecryption(
  handles: string[],
  contractAddress: string,
  userAddress: string,
  signTypedData: (params: any) => Promise<string>,
  maxRetries: number = 3
): Promise<BatchDecryptionResult> {
  const instance = getFhevmInstance();
  if (!instance) {
    return { success: false, error: "FHEVM SDK not initialized" };
  }

  if (handles.length === 0) {
    return { success: false, error: "No handles provided" };
  }

  // Convert addresses to checksum format (EIP-55)
  const checksumUserAddress = toChecksumAddress(userAddress);
  const checksumContractAddress = toChecksumAddress(contractAddress);

  // Generate keypair once for all retries
  const { publicKey, privateKey } = instance.generateKeypair();
  
  // Create EIP712 message for signature
  const startTimestamp = Math.floor(Date.now() / 1000);
  const durationDays = 1;
  
  const eip712 = instance.createEIP712(
    publicKey,
    [checksumContractAddress],
    startTimestamp,
    durationDays
  );
  
  console.log("📝 EIP712 for batch signing:", {
    primaryType: eip712.primaryType,
    handleCount: handles.length,
  });
  
  let signature: string;
  try {
    // Sign the message with user's wallet (only once!)
    signature = await signTypedData({
      domain: eip712.domain,
      types: eip712.types,
      primaryType: eip712.primaryType,
      message: eip712.message,
    });
    console.log("✍️ Single signature obtained for", handles.length, "handles");
  } catch (error: any) {
    return { success: false, error: "Failed to sign message: " + (error?.message || String(error)) };
  }
  
  console.log("🔑 Handles:", handles);
  console.log("📄 Contract:", checksumContractAddress);
  console.log("👤 User:", checksumUserAddress);

  // Build batch request with checksum address
  const batchRequest = handles.map(handle => ({ handle, contractAddress: checksumContractAddress }));

  // Retry loop for Relayer requests
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Batch decryption attempt ${attempt}/${maxRetries}...`);
      
      // Request batch user decryption via relayer
      const results = await instance.userDecrypt(
        batchRequest,
        privateKey,
        publicKey,
        signature,
        [checksumContractAddress],
        checksumUserAddress,
        startTimestamp,
        durationDays
      );
      
      console.log("🔓 Batch decryption results:", results);
      
      // Validate all results
      const values: Record<string, bigint> = {};
      for (const handle of handles) {
        const value = (results as Record<string, bigint>)[handle];
        if (typeof value === "bigint") {
          values[handle] = value;
        } else {
          console.warn(`Handle ${handle} returned unexpected type:`, typeof value);
        }
      }
      
      if (Object.keys(values).length === handles.length) {
        return { success: true, values };
      }
      
      return { success: false, error: "Some handles failed to decrypt" };
      
    } catch (error: any) {
      console.error(`Attempt ${attempt} failed:`, error);
      
      const errorMessage = error?.message || String(error);
      
      // If it's a 500 error and we have retries left, wait and retry
      if (errorMessage.includes("500") && attempt < maxRetries) {
        console.log(`⏳ Waiting 2 seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      
      // For other errors or last attempt, return error
      let friendlyError = errorMessage;
      if (errorMessage.includes("not authorized")) {
        friendlyError = "ACL authorization missing. The creator may need to create a new poll.";
      } else if (errorMessage.includes("500")) {
        friendlyError = "Relayer service unavailable. Zama infrastructure may be experiencing issues.";
      }
      
      return { success: false, error: friendlyError };
    }
  }
  
  return { success: false, error: "All decryption attempts failed" };
}

/**
 * Request public decryption (for publicly decryptable values)
 */
export async function requestPublicDecryption(handle: string): Promise<DecryptionResult> {
  const instance = getFhevmInstance();
  if (!instance) {
    return { success: false, error: "FHEVM SDK not initialized" };
  }

  try {
    const results = await instance.publicDecrypt([handle]);
    const value = results[handle];
    
    if (typeof value === "bigint") {
      return { success: true, value };
    }
    
    return { success: false, error: "Unexpected decryption result type" };
  } catch (error: any) {
    console.error("Public decryption failed:", error);
    return { success: false, error: error?.message || String(error) };
  }
}
