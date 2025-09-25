import { useEffect, useMemo, useState } from "react";

/**
 * InspectionsTester
 * A self-contained React component to exercise your /api/uploads and /api/inspections endpoints.
 *
 * Drop into any React app (Astro + React, Next, Vite, CRA). Requires the user to be signed-in with Clerk.
 * It will try to attach an Authorization header using window.Clerk if available, and it also sends cookies.
 */

export default function InspectionsTester({ apiBase = "/api" }: { apiBase?: string }) {
    const [file, setFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string>("");
    const [analyzing, setAnalyzing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [analyzeResult, setAnalyzeResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(12);
    const [listLoading, setListLoading] = useState(false);
    const [inspections, setInspections] = useState<any[]>([]);
    const [total, setTotal] = useState<number | null>(null);
    const [detail, setDetail] = useState<any | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [rawBase64, setRawBase64] = useState<string>(""); // no data: prefix

    const imgPreview = useMemo(() => {
        if (imageUrl) return imageUrl;
        if (file) return URL.createObjectURL(file);
        return "";
    }, [file, imageUrl]);

    useEffect(() => {
        return () => {
            if (file) URL.revokeObjectURL(URL.createObjectURL(file));
        };
    }, [file]);

    async function getAuthHeaders() {
        try {
            const token = await (window as any)?.Clerk?.session?.getToken?.({ template: "*" });
            if (token) return { Authorization: `Bearer ${token}` } as Record<string, string>;
        } catch {}
        return {};
    }

    async function uploadViaFile() {
        if (!file) return;
        setUploading(true);
        setError(null);
        setAnalyzeResult(null);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const headers = await getAuthHeaders();
            const res = await fetch(`${apiBase}/uploads/file`, {
                method: "POST",
                credentials: "include",
                headers,
                body: fd,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
            setImageUrl(data.url);
        } catch (e: any) {
            setError(e?.message || String(e));
        } finally {
            setUploading(false);
        }
    }

    async function uploadViaBase64() {
        if (!rawBase64) return;
        setUploading(true);
        setError(null);
        setAnalyzeResult(null);
        try {
            const headers = {
                "Content-Type": "application/json",
                ...(await getAuthHeaders()),
            } as Record<string, string>;
            const res = await fetch(`${apiBase}/uploads/base64`, {
                method: "POST",
                credentials: "include",
                headers,
                body: JSON.stringify({ base64: rawBase64, filename: file?.name || "image" }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
            setImageUrl(data.url);
        } catch (e: any) {
            setError(e?.message || String(e));
        } finally {
            setUploading(false);
        }
    }

    async function analyzeFromUrl() {
        if (!imageUrl) return;
        setAnalyzing(true);
        setError(null);
        setAnalyzeResult(null);
        try {
            const headers = {
                "Content-Type": "application/json",
                ...(await getAuthHeaders()),
            } as Record<string, string>;
            const res = await fetch(`${apiBase}/inspections/analyze`, {
                method: "POST",
                credentials: "include",
                headers,
                body: JSON.stringify({ imageUrl }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
            setAnalyzeResult(data);
            // refresh list after successful analyze
            fetchList(page, pageSize);
        } catch (e: any) {
            setError(e?.message || String(e));
        } finally {
            setAnalyzing(false);
        }
    }

    async function analyzeFromFileAsBase64() {
        if (!file) return;
        setAnalyzing(true);
        setError(null);
        setAnalyzeResult(null);
        try {
            const b64 = await fileToRawBase64(file);
            const headers = {
                "Content-Type": "application/json",
                ...(await getAuthHeaders()),
            } as Record<string, string>;
            const res = await fetch(`${apiBase}/inspections/analyze`, {
                method: "POST",
                credentials: "include",
                headers,
                body: JSON.stringify({ imageData: b64, imageType: file.type || "image/jpeg" }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
            setAnalyzeResult(data);
            fetchList(page, pageSize);
        } catch (e: any) {
            setError(e?.message || String(e));
        } finally {
            setAnalyzing(false);
        }
    }

    async function fetchList(p = 1, ps = pageSize) {
        setListLoading(true);
        setError(null);
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${apiBase}/inspections/list?page=${p}&pageSize=${ps}`, {
                credentials: "include",
                headers,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
            setInspections(data.inspections || []);
            setPage(data.page || p);
            setPageSize(data.pageSize || ps);
            setTotal((data as any).total ?? null); // list endpoint doesn't return total; admin does
        } catch (e: any) {
            setError(e?.message || String(e));
        } finally {
            setListLoading(false);
        }
    }

    async function fetchDetail(id: string) {
        setDetailLoading(true);
        setError(null);
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${apiBase}/inspections/${id}`, {
                credentials: "include",
                headers,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
            setDetail(data.inspection);
        } catch (e: any) {
            setError(e?.message || String(e));
        } finally {
            setDetailLoading(false);
        }
    }

    useEffect(() => {
        fetchList(1, pageSize);
    }, []);

    return (
        <div className="p-4 max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Inspections Tester</h1>

            {/* Upload / Analyze Panel */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 border rounded-2xl space-y-3">
                    <h2 className="font-semibold">1) Provide an image</h2>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={uploadViaFile}
                            disabled={!file || uploading}
                            className="px-3 py-2 rounded-lg bg-black text-white disabled:opacity-50"
                        >
                            {uploading ? "Uploading…" : "Upload file → Blob"}
                        </button>
                        <button
                            onClick={analyzeFromFileAsBase64}
                            disabled={!file || analyzing}
                            className="px-3 py-2 rounded-lg bg-gray-800 text-white disabled:opacity-50"
                        >
                            {analyzing ? "Analyzing…" : "Analyze (send base64)"}
                        </button>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm">…or paste a public image URL</label>
                        <input
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            placeholder="https://…"
                            className="w-full border rounded px-3 py-2"
                        />
                        <button
                            onClick={analyzeFromUrl}
                            disabled={!imageUrl || analyzing}
                            className="px-3 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
                        >
                            {analyzing ? "Analyzing…" : "Analyze from URL"}
                        </button>
                    </div>

                    <details className="mt-2">
                        <summary className="cursor-pointer text-sm opacity-80">Advanced: upload raw base64</summary>
                        <textarea
                            className="w-full border rounded p-2 text-xs h-24"
                            placeholder="iVBORw0KGgoAAAANSUhEUg… (no data: prefix)"
                            value={rawBase64}
                            onChange={(e) => setRawBase64(e.target.value.trim())}
                        />
                        <button
                            onClick={uploadViaBase64}
                            disabled={!rawBase64 || uploading}
                            className="mt-2 px-3 py-2 rounded-lg bg-black text-white disabled:opacity-50"
                        >
                            {uploading ? "Uploading…" : "Upload base64 → Blob"}
                        </button>
                    </details>
                </div>

                <div className="p-4 border rounded-2xl space-y-3">
                    <h2 className="font-semibold">Preview</h2>
                    {imgPreview ? (
                        <img src={imgPreview} alt="preview" className="max-h-80 rounded-xl object-contain border" />
                    ) : (
                        <div className="text-sm opacity-70">Choose a file or paste a URL to see a preview.</div>
                    )}
                    {imageUrl && (
                        <div className="text-xs break-all">
                            <span className="font-mono">Blob URL:</span> {imageUrl}
                        </div>
                    )}
                </div>
            </div>

            {/* Analyze Result */}
            {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-800 border border-red-200">
                    <strong>Error:</strong> {error}
                </div>
            )}

            {analyzeResult && (
                <div className="mb-6 p-4 border rounded-2xl">
                    <h2 className="font-semibold mb-2">Analyze Response</h2>
                    {analyzeResult?.inspection?.imageUrl && (
                        <img
                            src={analyzeResult.inspection.imageUrl}
                            alt="analyzed"
                            className="max-h-56 rounded-lg border mb-3"
                        />
                    )}
                    <div className="grid md:grid-cols-2 gap-4">
            <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-96">
              {JSON.stringify(analyzeResult.analysis, null, 2)}
            </pre>
                        <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-96">
              {JSON.stringify({
                  inspection: {
                      id: analyzeResult?.inspection?.id,
                      hazardCount: analyzeResult?.inspection?.hazardCount,
                      riskScore: analyzeResult?.inspection?.riskScore,
                      safetyGrade: analyzeResult?.inspection?.safetyGrade,
                      processingStatus: analyzeResult?.inspection?.processingStatus,
                  },
                  usage: analyzeResult?.usage,
              }, null, 2)}
            </pre>
                    </div>
                </div>
            )}

            {/* List & Pagination */}
            <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="font-semibold">Your Inspections</h2>
                <div className="flex items-center gap-2">
                    <label className="text-sm">Page size</label>
                    <select
                        className="border rounded px-2 py-1"
                        value={pageSize}
                        onChange={(e) => {
                            const ps = parseInt(e.target.value, 10) || 12;
                            setPageSize(ps);
                            fetchList(1, ps);
                        }}
                    >
                        {[6, 12, 20, 30, 50].map((n) => (
                            <option key={n} value={n}>{n}</option>
                        ))}
                    </select>
                    <button
                        className="px-3 py-1 rounded bg-gray-100 border"
                        onClick={() => fetchList(page, pageSize)}
                        disabled={listLoading}
                    >
                        {listLoading ? "Refreshing…" : "Refresh"}
                    </button>
                </div>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {inspections.map((it) => (
                    <div key={it.id} className="border rounded-xl p-3 flex flex-col gap-2">
                        {it.imageUrl && (
                            <img src={it.imageUrl} alt="thumb" className="h-40 w-full object-cover rounded-lg border" />
                        )}
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">Grade: {it.safetyGrade}</span>
                            <span className="opacity-70">Risk: {it.riskScore}</span>
                        </div>
                        <div className="text-xs opacity-70">
                            {new Date(it.createdAt).toLocaleString()}
                        </div>
                        <button
                            className="px-3 py-2 rounded-lg bg-blue-600 text-white"
                            onClick={() => fetchDetail(it.id)}
                        >
                            View JSON
                        </button>
                    </div>
                ))}
            </div>

            {inspections.length > 0 && (
                <div className="flex items-center gap-2 justify-center mt-4">
                    <button
                        className="px-3 py-1 rounded bg-gray-100 border"
                        onClick={() => {
                            const p = Math.max(1, page - 1);
                            setPage(p);
                            fetchList(p, pageSize);
                        }}
                        disabled={page <= 1 || listLoading}
                    >
                        Prev
                    </button>
                    <span className="text-sm">Page {page}</span>
                    <button
                        className="px-3 py-1 rounded bg-gray-100 border"
                        onClick={() => {
                            const p = page + 1;
                            setPage(p);
                            fetchList(p, pageSize);
                        }}
                        disabled={listLoading || inspections.length < pageSize}
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Detail Drawer */}
            {detailLoading && (
                <div className="mt-6 text-sm opacity-70">Loading details…</div>
            )}
            {detail && (
                <div className="mt-6 p-4 border rounded-2xl">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">Inspection Detail</h3>
                        <button className="text-sm underline" onClick={() => setDetail(null)}>Close</button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            {detail.imageUrl && (
                                <img src={detail.imageUrl} alt="full" className="rounded-lg border" />
                            )}
                            <div className="text-xs mt-2">
                                <div>ID: {detail.id}</div>
                                <div>Grade: {detail.safetyGrade} • Risk: {detail.riskScore} • Hazards: {detail.hazardCount}</div>
                                <div>Created: {new Date(detail.createdAt).toLocaleString()}</div>
                            </div>
                        </div>
                        <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-[60vh]">
{JSON.stringify(detail.analysisResults ?? detail, null, 2)}
            </pre>
                    </div>
                </div>
            )}

            <footer className="mt-10 text-xs opacity-70">
                Tip: If you get 401/403, ensure you are signed in and that your front-end domain is allowed by CORS.
            </footer>
        </div>
    );
}

async function fileToRawBase64(file: File): Promise<string> {
    const buf = await file.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buf);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    // returns WITHOUT data: prefix, which your API expects
    return btoa(binary);
}
