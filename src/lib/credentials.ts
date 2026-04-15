/**
 * Unified credential resolver for App Store Connect and Google Play.
 *
 * Priority: app-level StoreCredential (if set) → team-level keys (legacy).
 * This keeps backward compatibility for teams that haven't migrated.
 */
import prisma from '@/lib/prisma';

export interface AppStoreCredentials {
  privateKey: string;
  keyId: string;
  issuerId: string;
  /** Cached JWT (may be expired — callers should check/refresh) */
  jwt?: string | null;
  jwtExpiresAt?: Date | null;
  /** Source so callers can persist a refreshed JWT back */
  source: 'credential' | 'team';
  sourceId: string; // credentialId or teamId
}

export interface GooglePlayCredentials {
  serviceAccountKey: string;
}

/**
 * Returns App Store Connect credentials for a given app, falling back to team keys.
 * Throws if no credentials are configured.
 */
export async function getAppStoreCredentials(
  appId: string
): Promise<AppStoreCredentials> {
  const app = await prisma.app.findUnique({
    where: { id: appId },
    select: {
      teamId: true,
      credential: {
        select: {
          id: true,
          privateKey: true,
          keyId: true,
          issuerId: true,
          jwt: true,
          jwtExpiresAt: true,
        },
      },
      team: {
        select: {
          id: true,
          appStoreConnectPrivateKey: true,
          appStoreConnectKeyId: true,
          appStoreConnectIssuerId: true,
          appStoreConnectJWT: true,
          appStoreConnectJWTExpiresAt: true,
        },
      },
    },
  });

  if (!app) throw new Error(`App ${appId} not found`);

  // Prefer app-level credential
  const cred = app.credential;
  if (cred?.privateKey && cred.keyId && cred.issuerId) {
    return {
      privateKey: cred.privateKey,
      keyId: cred.keyId,
      issuerId: cred.issuerId,
      jwt: cred.jwt,
      jwtExpiresAt: cred.jwtExpiresAt,
      source: 'credential',
      sourceId: cred.id,
    };
  }

  // Fall back to team-level keys
  const team = app.team;
  if (
    team?.appStoreConnectPrivateKey &&
    team.appStoreConnectKeyId &&
    team.appStoreConnectIssuerId
  ) {
    return {
      privateKey: team.appStoreConnectPrivateKey,
      keyId: team.appStoreConnectKeyId,
      issuerId: team.appStoreConnectIssuerId,
      jwt: team.appStoreConnectJWT,
      jwtExpiresAt: team.appStoreConnectJWTExpiresAt,
      source: 'team',
      sourceId: team.id,
    };
  }

  throw new Error(
    'No App Store Connect credentials configured. Please add credentials in Settings.'
  );
}

/**
 * Persists a freshly generated JWT back to the credential source.
 */
export async function cacheAppStoreJWT(
  source: 'credential' | 'team',
  sourceId: string,
  jwt: string,
  expiresAt: Date
): Promise<void> {
  if (source === 'credential') {
    await prisma.storeCredential.update({
      where: { id: sourceId },
      data: { jwt, jwtExpiresAt: expiresAt },
    });
  } else {
    await prisma.team.update({
      where: { id: sourceId },
      data: {
        appStoreConnectJWT: jwt,
        appStoreConnectJWTExpiresAt: expiresAt,
      },
    });
  }
}

/**
 * Returns Google Play service account credentials for a given app.
 */
export async function getGooglePlayCredentials(
  appId: string
): Promise<GooglePlayCredentials> {
  const app = await prisma.app.findUnique({
    where: { id: appId },
    select: {
      credential: { select: { serviceAccountKey: true } },
      team: { select: { googleServiceAccountKey: true } },
    },
  });

  if (!app) throw new Error(`App ${appId} not found`);

  const credKey = app.credential?.serviceAccountKey;
  if (credKey) {
    return {
      serviceAccountKey:
        typeof credKey === 'string' ? credKey : JSON.stringify(credKey),
    };
  }

  const teamKey = app.team?.googleServiceAccountKey;
  if (teamKey) {
    return {
      serviceAccountKey:
        typeof teamKey === 'string' ? teamKey : JSON.stringify(teamKey),
    };
  }

  throw new Error(
    'No Google Play credentials configured. Please add credentials in Settings.'
  );
}
