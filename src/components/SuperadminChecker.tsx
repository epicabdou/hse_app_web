import React, { useState } from 'react'
import { Loader2, CheckCircle, XCircle, Shield, AlertCircle } from 'lucide-react'
import { useAuth } from '@clerk/react-router' // or '@clerk/nextjs'

/** ===== Types ===== */
type SuperadminOk = {
    message: string
    timestamp: string
    userId: string
}

type ApiError = {
    error: string
}

type SingleResult =
    | {
    kind: 'single'
    isSuperadmin: true
    message: string
    data: SuperadminOk
    error?: never
}
    | {
    kind: 'single'
    isSuperadmin: false
    message: string
    error: string
    data?: never
}

type MultiEndpointItem =
    | {
    endpoint: string
    status: number
    statusText: string
    isSuperadmin: boolean
    error?: never
}
    | {
    endpoint: string
    isSuperadmin: false
    error: string
    status?: never
    statusText?: never
}

type MultiResult = {
    kind: 'multi'
    results: MultiEndpointItem[]
}

type ResultState = SingleResult | MultiResult

/** ===== Component ===== */
const API_BASE = 'https://hseappapi.vercel.app'

const SuperadminChecker: React.FC = () => {
    const { getToken, isSignedIn } = useAuth()
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<ResultState | null>(null)
    const [error, setError] = useState<string | null>(null)

    const authFetch = async <T,>(input: RequestInfo | URL, init?: RequestInit): Promise<{ res: Response; data: T }> => {
        const token = await getToken()
        if (!token) throw new Error('No session token. Are you signed in?')

        const res = await fetch(input, {
            ...init,
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                ...(init?.headers ?? {}),
            },
        })

        // Try to parse JSON; if it fails, throw a generic error
        let data: unknown
        try {
            data = await res.json()
        } catch {
            throw new Error(`Non-JSON response (status ${res.status})`)
        }

        return { res, data: data as T }
    }

    const checkSuperadminStatus = async (): Promise<void> => {
        setLoading(true)
        setResult(null)
        setError(null)

        try {
            if (!isSignedIn) throw new Error('You must be signed in.')

            const { res, data } = await authFetch<SuperadminOk | ApiError>(`${API_BASE}/api/superadmin-only`, { method: 'GET' })

            if (res.ok) {
                setResult({
                    kind: 'single',
                    isSuperadmin: true,
                    message: 'Access granted! You are a superadmin.',
                    data: data as SuperadminOk,
                })
            } else if (res.status === 403) {
                setResult({
                    kind: 'single',
                    isSuperadmin: false,
                    message: 'Access denied. You are not a superadmin.',
                    error: (data as ApiError).error ?? 'Forbidden',
                })
            } else {
                setError(`Unexpected response: ${res.status} - ${(data as ApiError).error ?? 'Unknown error'}`)
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error'
            setError(`Network/auth error: ${msg}`)
        } finally {
            setLoading(false)
        }
    }

    const testMultipleEndpoints = async (): Promise<void> => {
        const endpoints = [`${API_BASE}/api/superadmin-only`, `${API_BASE}/protected`]
        setLoading(true)
        setResult(null)
        setError(null)

        const results: MultiEndpointItem[] = []

        for (const endpoint of endpoints) {
            try {
                const { res } = await authFetch<unknown>(endpoint, { method: 'GET' })
                results.push({
                    endpoint,
                    status: res.status,
                    statusText: res.statusText,
                    isSuperadmin: res.ok,
                })
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Unknown error'
                results.push({
                    endpoint,
                    isSuperadmin: false,
                    error: msg,
                })
            }
        }

        setResult({ kind: 'multi', results })
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
                <div className="flex items-center justify-center mb-6">
                    <Shield className="h-12 w-12 text-indigo-600" />
                </div>

                <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">Superadmin Role Checker</h1>
                <p className="text-center text-gray-600 mb-8">Test if your account has superadmin privileges</p>

                <div className="space-y-4">
                    <button
                        onClick={checkSuperadminStatus}
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                                Checking...
                            </>
                        ) : (
                            'Check Superadmin Status'
                        )}
                    </button>

                    <button
                        onClick={testMultipleEndpoints}
                        disabled={loading}
                        className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                                Testing...
                            </>
                        ) : (
                            'Test Multiple Endpoints'
                        )}
                    </button>
                </div>

                {result && (
                    <div
                        className={`mt-6 p-4 rounded-lg ${
                            result.kind === 'multi'
                                ? 'bg-blue-50 border border-blue-200'
                                : result.isSuperadmin
                                    ? 'bg-green-50 border border-green-200'
                                    : 'bg-red-50 border border-red-200'
                        }`}
                    >
                        {result.kind === 'multi' ? (
                            <div className="space-y-2">
                                <div className="flex items-center mb-2">
                                    <AlertCircle className="h-5 w-5 text-blue-600 mr-2" />
                                    <span className="font-semibold text-blue-900">Multi-Endpoint Test Results</span>
                                </div>
                                {result.results.map((r, idx) => (
                                    <div key={idx} className="text-sm">
                                        <span className="font-mono">{r.endpoint}</span>
                                        <span
                                            className={`ml-2 font-semibold ${
                                                r.isSuperadmin ? 'text-green-600' : 'text-red-600'
                                            }`}
                                        >
                      {'error' in r ? `Error: ${r.error}` : `Status: ${r.status} ${r.statusText}`}
                    </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center">
                                    {result.isSuperadmin ? (
                                        <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                                    ) : (
                                        <XCircle className="h-5 w-5 text-red-600 mr-2" />
                                    )}
                                    <span
                                        className={`font-semibold ${
                                            result.isSuperadmin ? 'text-green-900' : 'text-red-900'
                                        }`}
                                    >
                    {result.message}
                  </span>
                                </div>

                                {'error' in result && result.error && (
                                    <p className="mt-2 text-sm text-red-700">Server response: {result.error}</p>
                                )}

                                {'data' in result && result.data && (
                                    <div className="mt-3 p-2 bg-white rounded border border-gray-200">
                    <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {error && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start">
                            <XCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                            <div>
                                <span className="font-semibold text-red-900">Error occurred</span>
                                <p className="mt-1 text-sm text-red-700">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Setup Instructions:</h3>
                    <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                        <li>Ensure your Express API checks the Bearer token (Clerk) on cross-origin requests</li>
                        <li>Update <span className="font-mono">API_BASE</span> if your API URL changes</li>
                        <li>Make sure you’re signed in when testing</li>
                        <li>Set <span className="font-mono">publicMetadata.appRole = "superadmin"</span> for access</li>
                    </ol>
                </div>
            </div>
        </div>
    )
}

export default SuperadminChecker
