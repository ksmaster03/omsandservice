import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env';

export interface GoogleProfile {
  googleId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string | null;
}

let clientSingleton: OAuth2Client | null = null;
function getClient(): OAuth2Client {
  if (!clientSingleton) clientSingleton = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  return clientSingleton;
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID not configured on server');
  }
  const ticket = await getClient().verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw new Error('Invalid Google ID token payload');
  }
  return {
    googleId: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified ?? false,
    name: payload.name ?? payload.email,
    picture: payload.picture ?? null,
  };
}
