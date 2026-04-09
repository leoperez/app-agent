import { createPrivateKey } from 'crypto';
import { decodeJwt, SignJWT } from 'jose';
import { AppStoreConnectAuthError } from '@/types/errors';

export function isAppStoreConnectJWTExpired(token: string): boolean {
  try {
    const payload = decodeJwt(token);
    if (!payload.exp) return true;
    // exp is in seconds, Date.now() is in milliseconds
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

export async function generateJWT(
  issuerId: string,
  keyId: string,
  privateKey: string
) {
  try {
    // Create a private key object
    const privateKeyObject = createPrivateKey({
      key: privateKey,
      format: 'pem',
      type: 'pkcs8',
    });

    // Generate the JWT
    const jwt = await new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: keyId })
      .setIssuer(issuerId)
      .setIssuedAt()
      .setExpirationTime('20m')
      .setAudience('appstoreconnect-v1')
      .sign(privateKeyObject);

    return jwt;
  } catch (e: any) {
    throw new AppStoreConnectAuthError(e.message);
  }
}
