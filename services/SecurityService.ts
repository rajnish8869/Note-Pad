import { EncryptedData } from "../types";

export class SecurityService {
  private static ALGORITHM = "AES-GCM";
  private static KDF = "PBKDF2";
  private static SALT_LEN = 16;
  private static IV_LEN = 12;
  private static ITERATIONS = 100000;

  // Convert string to Uint8Array
  private static strToBuf(str: string): Uint8Array {
    return new TextEncoder().encode(str);
  }

  // Convert ArrayBuffer/TypedArray to string
  private static bufToStr(buf: ArrayBuffer | Uint8Array): string {
    // TextDecoder accepts ArrayBuffer or TypedArray
    return new TextDecoder().decode(
      buf instanceof Uint8Array ? buf : new Uint8Array(buf)
    );
  }

  // Convert buffer to Base64 (safe for large buffers)
  private static bufToBase64(buf: ArrayBuffer | Uint8Array): string {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);

    // Build binary string in chunks to avoid call/argument size limits.
    let binary = "";
    const chunkSize = 0x8000; // 32KB chunks
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    return btoa(binary);
  }

  // Convert Base64 to Uint8Array
  private static base64ToBuf(str: string): Uint8Array {
    const binary = atob(str);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Generates a cryptographic key from a password/pin and salt
   */
  static async deriveKey(
    password: string,
    salt: Uint8Array
  ): Promise<CryptoKey> {
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      this.strToBuf(password),
      { name: this.KDF },
      false,
      ["deriveBits", "deriveKey"]
    );

    return window.crypto.subtle.deriveKey(
      {
        name: this.KDF,
        salt: salt,
        iterations: this.ITERATIONS,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: this.ALGORITHM, length: 256 },
      true, // Key is exportable to be used in memory
      ["encrypt", "decrypt"]
    );
  }

  /**
   * Encrypts text using the provided key
   */
  static async encrypt(text: string, key: CryptoKey): Promise<EncryptedData> {
    const iv = window.crypto.getRandomValues(new Uint8Array(this.IV_LEN));
    const encodedData = this.strToBuf(text);

    const cipherBuffer = await window.crypto.subtle.encrypt(
      {
        name: this.ALGORITHM,
        iv: iv,
      },
      key,
      encodedData
    );

    // We don't store the salt here because the key is already derived.
    // The salt is stored with the key verifier or passed in.
    return {
      cipherText: this.bufToBase64(cipherBuffer),
      iv: this.bufToBase64(iv),
      salt: "", // Placeholder, managed by the caller/storage config
    };
  }

  /**
   * Decrypts data using the provided key
   */
  static async decrypt(data: EncryptedData, key: CryptoKey): Promise<string> {
    const iv = this.base64ToBuf(data.iv);
    const cipherText = this.base64ToBuf(data.cipherText);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: this.ALGORITHM,
        iv: iv,
      },
      key,
      cipherText
    );

    return this.bufToStr(decryptedBuffer);
  }

  /**
   * Create a hash verifier to check if password is correct without storing it.
   * Returns a salt and the hash of a known string encrypted with the derived key.
   */
  static async createVerifier(
    password: string
  ): Promise<{ salt: string; verifier: string }> {
    const salt = window.crypto.getRandomValues(new Uint8Array(this.SALT_LEN));
    const key = await this.deriveKey(password, salt);

    // We encrypt a constant string. If we can decrypt it later, the password is correct.
    const TEST_PHRASE = "VERIFY_ME";
    const encrypted = await this.encrypt(TEST_PHRASE, key);

    return {
      salt: this.bufToBase64(salt),
      verifier: JSON.stringify(encrypted),
    };
  }

  /**
   * Verify password against stored salt/verifier
   */
  static async verifyPassword(
    password: string,
    storedSalt: string,
    storedVerifier: string
  ): Promise<CryptoKey | null> {
    try {
      const salt = this.base64ToBuf(storedSalt);
      const key = await this.deriveKey(password, salt);
      const verifierData: EncryptedData = JSON.parse(storedVerifier);

      const result = await this.decrypt(verifierData, key);

      if (result === "VERIFY_ME") {
        return key;
      }
      return null;
    } catch (e) {
      // Expected behavior: Decryption fails if the key (password) is wrong.
      // We suppress the console error to avoid noise in the logs.
      return null;
    }
  }
}
