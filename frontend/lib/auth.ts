import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'checklist-secret-change-in-production'
)

export type TokenPayload =
  | { role: 'admin' }
  | { role: 'doer'; employeeId: string; name: string }

export async function signToken(payload: TokenPayload) {
  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('12h')
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as TokenPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<TokenPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('cl_token')?.value
  if (!token) return null
  return verifyToken(token)
}

export function requireAdmin(session: TokenPayload | null) {
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

export function requireDoer(session: TokenPayload | null) {
  if (!session || session.role !== 'doer') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
