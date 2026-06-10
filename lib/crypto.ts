import crypto from "crypto";

// 대칭키(32바이트)를 env 비밀에서 파생. WP_ENCRYPTION_KEY 미설정 시 암호화 비활성(평문 유지).
function keyBuf(): Buffer | null {
  const s = process.env.WP_ENCRYPTION_KEY;
  if (!s) return null;
  return crypto.createHash("sha256").update(s).digest(); // 항상 32바이트
}

/**
 * 비밀값(워드프레스 앱 비밀번호 등)을 AES-256-GCM으로 암호화한다.
 * 형식: enc:v1:<iv>:<tag>:<ciphertext> (모두 base64).
 * 키가 없으면 평문 그대로 반환(점진 도입 — 기능은 안 깨지되, 키를 넣으면 자동 암호화).
 */
export function encryptSecret(plain: string): string {
  const key = keyBuf();
  if (!key || !plain) return plain;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

/** 저장된 비밀값을 복호화한다. 'enc:v1:' 접두사가 없으면 레거시 평문으로 보고 그대로 반환. */
export function decryptSecret(stored: string): string {
  if (!stored || !stored.startsWith("enc:v1:")) return stored;
  const key = keyBuf();
  if (!key) return stored;
  try {
    const [, , ivB, tagB, dataB] = stored.split(":");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivB, "base64"));
    decipher.setAuthTag(Buffer.from(tagB, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(dataB, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return stored;
  }
}
