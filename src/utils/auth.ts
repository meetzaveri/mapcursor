import { generateRandomUsernames } from './misc'

const AUTH_URL = import.meta.env.VITE_AUTH_ENDPOINT
const TOKEN_KEY = 'token'
const USER_KEY = 'userId'

type Session = { token: string; userId: string }
type Result = { ok: true; session: Session } | { ok: false; status: number }

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY)

function saveSession({ token, userId }: Session): void {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, userId)
}

// status 0 = network error (backend unreachable)
async function post(
    path: string,
    body: object,
    token?: string | null
): Promise<Result> {
    try {
        const res = await fetch(`${AUTH_URL}${path}`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                ...(token ? { authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(body),
        })
        if (!res.ok) return { ok: false, status: res.status }
        return { ok: true, session: (await res.json()) as Session }
    } catch {
        return { ok: false, status: 0 }
    }
}

const isTransient = (status: number): boolean => status === 0 || status >= 500

// Only 400/401/403/404 may fall through to registering a new user. A network
// error or 5xx must not, or a backend outage would replace returning users.
async function runSession(): Promise<string> {
    const token = getToken()
    const userId = localStorage.getItem(USER_KEY)

    if (token) {
        const r = await post('/auth/session', {}, token)
        if (r.ok) {
            saveSession(r.session)
            return r.session.token
        }
        if (isTransient(r.status)) return token
        localStorage.removeItem(TOKEN_KEY)
    }

    if (userId) {
        const r = await post('/auth/session', { userId })
        if (r.ok) {
            saveSession(r.session)
            return r.session.token
        }
        if (isTransient(r.status)) throw new Error('Auth backend unavailable')
    }

    const r = await post('/auth/register', generateRandomUsernames())
    if (r.ok) {
        saveSession(r.session)
        return r.session.token
    }
    throw new Error('Could not create user')
}

let inflight: Promise<string> | null = null

export function ensureSession(): Promise<string> {
    if (!inflight) {
        inflight = runSession().finally(() => {
            inflight = null
        })
    }
    return inflight
}
