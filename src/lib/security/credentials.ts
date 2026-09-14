import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

export type EncryptedCredential = {
  ciphertext: string;
  iv: string;
  tag: string;
  fingerprint: string;
  lastFour: string;
};

function keyFromHex(secretHex: string): Buffer {
  if (!/^[a-fA-F0-9]{64}$/.test(secretHex))
    throw new Error(
      "Provider encryption secret must be 64 hexadecimal characters",
    );
  return Buffer.from(secretHex, "hex");
}

export function encryptCredential(
  value: string,
  secretHex: string,
): EncryptedCredential {
  if (value.length < 8) throw new Error("Provider credential is too short");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFromHex(secretHex), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    fingerprint: createHash("sha256").update(value).digest("hex").slice(0, 16),
    lastFour: value.slice(-4),
  };
}

export function decryptCredential(
  value: Pick<EncryptedCredential, "ciphertext" | "iv" | "tag">,
  secretHex: string,
): string {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    keyFromHex(secretHex),
    Buffer.from(value.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(value.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(value.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
