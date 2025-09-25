import React, { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Download, Search, Eye, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { Label } from "@/components/ui/label";

/**
 * AdminInspectionsPanel with shadcn/ui
 * --------------------------------------------------------------
 * A modern admin UI to manage inspections using shadcn/ui components.
 * - Fetches from:
 *   GET  /api/inspections/admin/all    (with filters & pagination)
 *   GET  /api/inspections/admin/stats
 * - Requires superadmin auth (Clerk). Provide a getToken() prop to attach the
 *   Authorization header.
 * --------------------------------------------------------------
 */

// ---- Types matching your API schema ----
export type SafetyGrade = "A" | "B" | "C" | "D" | "F";
export type ProcessingStatus = "pending" | "processing" | "completed" | "failed";

export interface AdminInspectionRow {
    id: string;
    createdAt: string;
    updatedAt: string | null;
    userId: string;
    imageUrl: string;
    hazardCount: number | null;
    riskScore: number | null;
    safetyGrade: SafetyGrade | null;
    processingStatus: ProcessingStatus;
    userEmail?: string | null;
    userFirstName?: string | null;
    userLastName?: string | null;
}

export interface AdminAllResponse {
    ok: boolean;
    page: number;
    pageSize: number;
    total: number;
    inspections: AdminInspectionRow[];
}

export interface AdminStatsResponse {
    ok: boolean;
    metrics: {
        totalInspections: number;
        topUsers: { userId: string; count: number }[];
    };
}

// ---- Utils ----
const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : "-");

const grades: (SafetyGrade | "")[] = ["", "A", "B", "C", "D", "F"];
const statuses: (ProcessingStatus | "")[] = ["", "pending", "processing", "completed", "failed"];
const sortByFields = ["createdAt", "riskScore", "hazardCount"] as const;

// Status badge variant mapping
const getStatusVariant = (status: ProcessingStatus) => {
    switch (status) {
        case "completed": return "default";
        case "failed": return "destructive";
        case "processing": return "secondary";
        case "pending": return "outline";
        default: return "outline";
    }
};

// Grade badge color mapping
const getGradeColor = (grade: SafetyGrade) => {
    switch (grade) {
        case "A": return "bg-green-100 text-green-800 hover:bg-green-100";
        case "B": return "bg-blue-100 text-blue-800 hover:bg-blue-100";
        case "C": return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
        case "D": return "bg-orange-100 text-orange-800 hover:bg-orange-100";
        case "F": return "bg-red-100 text-red-800 hover:bg-red-100";
        default: return "";
    }
};

// ---- Component Props ----
interface AdminInspectionsPanelProps {
    baseUrl?: string;
    getToken?: () => Promise<string | null>;
    pageSize?: number;
}

const buildQuery = (params: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== "") q.set(k, String(v));
    });
    return q.toString();
};

export const AdminInspectionsPanel: React.FC<AdminInspectionsPanelProps> = ({
                                                                                baseUrl = "",
                                                                                getToken,
                                                                                pageSize = 20,
                                                                            }) => {
    // Filters
    const [userId, setUserId] = useState("");
    const [grade, setGrade] = useState<SafetyGrade | "all">("all");
    const [status, setStatus] = useState<ProcessingStatus | "all">("all");
    const [from, setFrom] = useState<string>("");
    const [to, setTo] = useState<string>("");
    const [sortBy, setSortBy] = useState<(typeof sortByFields)[number]>("createdAt");
    const [order, setOrder] = useState<"asc" | "desc">("desc");

    // Data
    const [page, setPage] = useState(1);
    const [rows, setRows] = useState<AdminInspectionRow[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Stats
    const [stats, setStats] = useState<AdminStatsResponse["metrics"] | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);

    // Detail modal
    const [selected, setSelected] = useState<AdminInspectionRow | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

    const fetchAll = async () => {
        setLoading(true);
        setError(null);
        try {
            const qs = buildQuery({ page, pageSize, userId, grade, status, from, to, sortBy, order });
            const url = `${baseUrl}/api/inspections/admin/all?${qs}`;
            const headers: HeadersInit = { "Content-Type": "application/json" };
            if (getToken) {
                const token = await getToken();
                if (token) headers["Authorization"] = `Bearer ${token}`;
            }
            const res = await fetch(url, { headers });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data: AdminAllResponse = await res.json();
            if (!data.ok) throw new Error("Response not ok");
            setRows(data.inspections);
            setTotal(data.total);
        } catch (e: any) {
            setError(e.message || "Failed to load");
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        setStatsLoading(true);
        try {
            const url = `${baseUrl}/api/inspections/admin/stats`;
            const headers: HeadersInit = { "Content-Type": "application/json" };
            if (getToken) {
                const token = await getToken();
                if (token) headers["Authorization"] = `Bearer ${token}`;
            }
            const res = await fetch(url, { headers });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data: AdminStatsResponse = await res.json();
            if (!data.ok) throw new Error("Response not ok");
            setStats(data.metrics);
        } catch (e) {
            // ignore for now
        } finally {
            setStatsLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, [page, sortBy, order]);

    useEffect(() => {
        setPage(1);
        fetchAll();
    }, [userId, grade, status, from, to]);

    useEffect(() => {
        fetchStats();
    }, []);

    const onExportCSV = () => {
        const headers = [
            "id", "createdAt", "userEmail", "userId", "hazardCount", "riskScore", "safetyGrade", "processingStatus"
        ];
        const lines = rows.map(r => [
            r.id,
            new Date(r.createdAt).toISOString(),
            r.userEmail ?? "",
            r.userId,
            r.hazardCount ?? "",
            r.riskScore ?? "",
            r.safetyGrade ?? "",
            r.processingStatus
        ].map(v => `"${String(v).replaceAll('"', '""')}"`).join(","));

        const csv = [headers.join(","), ...lines].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `inspections_page${page}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleViewDetail = (inspection: AdminInspectionRow) => {
        setSelected(inspection);
        setDetailOpen(true);
    };

    return (
        <div className="container mx-auto max-w-7xl space-y-6 p-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-3xl font-bold tracking-tight">Inspections Admin</h1>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={fetchAll} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button variant="outline" onClick={onExportCSV}>
                        <Download className="h-4 w-4" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Inspections</CardTitle>
                        <Search className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {statsLoading ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Loading...
                                </div>
                            ) : (
                                stats?.totalInspections ?? "—"
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Top User</CardTitle>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-medium truncate">
                            {stats?.topUsers?.[0]
                                ? `${stats.topUsers[0].userId.slice(0, 8)}... (${stats.topUsers[0].count})`
                                : "—"
                            }
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Current Page</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-medium">{page} / {totalPages}</div>
                        <p className="text-xs text-muted-foreground">{total} total records</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <SlidersHorizontal className="h-4 w-4" />
                        Filters
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="userId">User ID</Label>
                            <Input
                                id="userId"
                                placeholder="Enter user ID..."
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Safety Grade</Label>
                            <Select value={grade} onValueChange={setGrade}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select grade" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Any Grade</SelectItem>
                                    {grades.slice(1).map(g => (
                                        <SelectItem key={g} value={g}>{g}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Processing Status</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Any Status</SelectItem>
                                    {statuses.slice(1).map(s => (
                                        <SelectItem key={s} value={s}>
                                            {s.charAt(0).toUpperCase() + s.slice(1)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="from">From Date</Label>
                            <Input
                                id="from"
                                type="date"
                                value={from}
                                onChange={(e) => setFrom(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="to">To Date</Label>
                            <Input
                                id="to"
                                type="date"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                                <Label>Sort By</Label>
                                <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sortByFields.map(field => (
                                            <SelectItem key={field} value={field}>
                                                {field.charAt(0).toUpperCase() + field.slice(1)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Order</Label>
                                <Select value={order} onValueChange={(value) => setOrder(value as any)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="desc">Descending</SelectItem>
                                        <SelectItem value="asc">Ascending</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Inspections</CardTitle>
                        {loading && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading...
                            </div>
                        )}
                        {error && (
                            <Badge variant="destructive">{error}</Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <table className="w-full">
                            <thead>
                            <tr className="border-b bg-muted/50">
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Created</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">User</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Risk Score</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Hazards</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Grade</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {rows.map((inspection) => (
                                <tr key={inspection.id} className="border-b transition-colors hover:bg-muted/50">
                                    <td className="p-4 align-middle font-mono text-sm">
                                        {fmtDate(inspection.createdAt)}
                                    </td>
                                    <td className="p-4 align-middle max-w-[200px]">
                                        <div className="truncate">
                                            {inspection.userFirstName || inspection.userLastName
                                                ? `${inspection.userFirstName ?? ""} ${inspection.userLastName ?? ""}`.trim()
                                                : inspection.userEmail ?? inspection.userId.slice(0, 8) + "..."
                                            }
                                        </div>
                                    </td>
                                    <td className="p-4 align-middle">
                                        <div className="font-medium">
                                            {inspection.riskScore ?? "-"}
                                        </div>
                                    </td>
                                    <td className="p-4 align-middle">
                                        <div className="font-medium">
                                            {inspection.hazardCount ?? "-"}
                                        </div>
                                    </td>
                                    <td className="p-4 align-middle">
                                        {inspection.safetyGrade ? (
                                            <Badge className={getGradeColor(inspection.safetyGrade)}>
                                                {inspection.safetyGrade}
                                            </Badge>
                                        ) : (
                                            "-"
                                        )}
                                    </td>
                                    <td className="p-4 align-middle">
                                        <Badge variant={getStatusVariant(inspection.processingStatus)}>
                                            {inspection.processingStatus}
                                        </Badge>
                                    </td>
                                    <td className="p-4 align-middle text-right">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleViewDetail(inspection)}
                                        >
                                            <Eye className="h-4 w-4" />
                                            View
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {rows.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={7} className="h-24 text-center">
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <Search className="h-8 w-8" />
                                            <p>No inspections found.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between space-x-2 py-4">
                        <div className="text-sm text-muted-foreground">
                            Showing page {page} of {totalPages} ({total} total)
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page <= 1}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Detail Dialog */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Inspection Details</DialogTitle>
                    </DialogHeader>
                    {selected && (
                        <div className="grid gap-6 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Image</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <img
                                        src={selected.imageUrl}
                                        alt="Inspection"
                                        className="w-full rounded-lg object-contain max-h-96"
                                    />
                                </CardContent>
                            </Card>

                            <div className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Metadata</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <Label className="text-muted-foreground">ID</Label>
                                                <div className="font-mono text-xs break-all">
                                                    {selected.id}
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-muted-foreground">Created</Label>
                                                <div>{fmtDate(selected.createdAt)}</div>
                                            </div>
                                            <div>
                                                <Label className="text-muted-foreground">Status</Label>
                                                <Badge variant={getStatusVariant(selected.processingStatus)}>
                                                    {selected.processingStatus}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-muted-foreground">User</Label>
                                            <div className="break-all">
                                                {selected.userEmail ?? selected.userId}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Analysis Results</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="text-center">
                                                <div className="text-2xl font-bold">
                                                    {selected.riskScore ?? "-"}
                                                </div>
                                                <Label className="text-muted-foreground">Risk Score</Label>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold">
                                                    {selected.hazardCount ?? "-"}
                                                </div>
                                                <Label className="text-muted-foreground">Hazards</Label>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold">
                                                    {selected.safetyGrade ? (
                                                        <Badge className={getGradeColor(selected.safetyGrade)}>
                                                            {selected.safetyGrade}
                                                        </Badge>
                                                    ) : (
                                                        "-"
                                                    )}
                                                </div>
                                                <Label className="text-muted-foreground">Grade</Label>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminInspectionsPanel;