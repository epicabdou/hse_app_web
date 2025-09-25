import { useEffect, useMemo, useState } from "react";
import {
    Search,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    MoreHorizontal,
    Download,
    ChevronLeft,
    ChevronRight,
    RefreshCcw,
    Users,
    Calendar,
    Activity,
    Shield,
    ToggleLeft,
    ToggleRight,
    ChevronsLeft,
    ChevronsRight,
} from "lucide-react";

// Import shadcn/ui components
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Types
export type UserRow = {
    id: string;
    clerkUserId: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    imageUrl?: string | null;
    inspectionCount?: number | null;
    monthlyInspectionCount?: number | null;
    lastResetDate?: string | null;
    isActive?: boolean | null;
    createdAt?: string | null;
    updatedAt?: string | null;
};

export type FetchUsersResponse = UserRow[];

export type UserManagementTableProps = {
    listUrl?: string;
    mutateBaseUrl?: string;
    className?: string;
    includeCredentials?: boolean;
};

// Utilities
const formatDate = (iso?: string | null) => {
    if (!iso) return "—";
    const date = new Date(iso);
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
};

const formatShortDate = (iso?: string | null) => {
    if (!iso) return "—";
    const date = new Date(iso);
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(date);
};

const getInitials = (firstName?: string | null, lastName?: string | null, email?: string) => {
    if (firstName || lastName) {
        return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
    }
    return email?.substring(0, 2).toUpperCase() || 'U';
};

const toCsv = (rows: UserRow[]) => {
    const headers = [
        "id",
        "clerkUserId",
        "email",
        "firstName",
        "lastName",
        "inspectionCount",
        "monthlyInspectionCount",
        "lastResetDate",
        "isActive",
        "createdAt",
        "updatedAt",
    ];
    const csvRows = [
        headers.join(","),
        ...rows.map((r) =>
            [
                r.id,
                r.clerkUserId,
                r.email,
                r.firstName ?? "",
                r.lastName ?? "",
                r.inspectionCount ?? 0,
                r.monthlyInspectionCount ?? 0,
                r.lastResetDate ?? "",
                r.isActive ? "true" : "false",
                r.createdAt ?? "",
                r.updatedAt ?? "",
            ]
                .map((v) => `${String(v).replaceAll('"', '""')}`)
                .map((v) => (v.includes(",") ? `"${v}"` : v))
                .join(",")
        ),
    ];
    return csvRows.join("\n");
};

const downloadText = (text: string, filename: string) => {
    const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// Component
const PAGE_SIZE_DEFAULT = 10;

const UserManagementTable = ({
                                 listUrl = "/api/users",
                                 mutateBaseUrl = "/api/users",
                                 className,
                                 includeCredentials = true,
                             }) => {
    const [rows, setRows] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [sortKey, setSortKey] = useState<keyof UserRow>("createdAt");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState("all");

    const creds: RequestCredentials | undefined = includeCredentials
        ? "include"
        : undefined;

    // Fetch users
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(listUrl, {
                    credentials: creds,
                    headers: { "Content-Type": "application/json" },
                });
                if (!res.ok) throw new Error(`Failed to load users (${res.status})`);
                const data: FetchUsersResponse = await res.json();
                if (!cancelled) setRows(data ?? []);
            } catch (e: any) {
                if (!cancelled) setError(e?.message ?? "Unknown error");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [listUrl]);

    // Filter by tab
    const tabFiltered = useMemo(() => {
        if (activeTab === "active") return rows.filter(r => r.isActive);
        if (activeTab === "inactive") return rows.filter(r => !r.isActive);
        return rows;
    }, [rows, activeTab]);

    // Search and sort
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const base = q
            ? tabFiltered.filter((r) => {
                const name = `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim();
                return (
                    r.email?.toLowerCase().includes(q) ||
                    name.toLowerCase().includes(q) ||
                    r.clerkUserId?.toLowerCase().includes(q)
                );
            })
            : tabFiltered;

        const sorted = [...base].sort((a, b) => {
            const av = a[sortKey];
            const bv = b[sortKey];
            if (av == null && bv == null) return 0;
            if (av == null) return 1;
            if (bv == null) return -1;
            if (typeof av === "number" && typeof bv === "number")
                return sortDir === "asc" ? av - bv : bv - av;
            if (typeof av === "string" && typeof bv === "string") {
                const at = Date.parse(av);
                const bt = Date.parse(bv);
                if (!isNaN(at) && !isNaN(bt))
                    return sortDir === "asc" ? at - bt : bt - at;
            }
            const as = String(av).toLowerCase();
            const bs = String(bv).toLowerCase();
            return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
        });

        return sorted;
    }, [tabFiltered, query, sortKey, sortDir]);

    // Paginated page slice
    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paged = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, page, pageSize]);

    // Stats
    const stats = useMemo(() => {
        const active = rows.filter(r => r.isActive).length;
        const totalInspections = rows.reduce((sum, r) => sum + (r.inspectionCount ?? 0), 0);
        const monthlyInspections = rows.reduce((sum, r) => sum + (r.monthlyInspectionCount ?? 0), 0);
        return { active, totalInspections, monthlyInspections, total: rows.length };
    }, [rows]);

    // Handlers
    const toggleSort = (key: keyof UserRow) => {
        if (sortKey === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("asc");
        }
    };

    const refresh = async () => {
        try {
            setRefreshing(true);
            const res = await fetch(listUrl, {
                credentials: creds,
                headers: { "Content-Type": "application/json" },
            });
            if (!res.ok) throw new Error(`Failed to load users (${res.status})`);
            const data: FetchUsersResponse = await res.json();
            setRows(data ?? []);
            setError(null);
        } catch (e: any) {
            setError(e?.message ?? "Unknown error");
        } finally {
            setRefreshing(false);
        }
    };

    const patchUser = async (id: string, body: Record<string, any>) => {
        const res = await fetch(`${mutateBaseUrl}/${id}`, {
            method: "PATCH",
            credentials: creds,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`PATCH failed (${res.status})`);
        return (await res.json()) as UserRow;
    };

    const onToggleActive = async (row: UserRow) => {
        const next = !(row.isActive ?? false);
        setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, isActive: next } : r)));
        try {
            await patchUser(row.id, { isActive: next });
        } catch (e) {
            setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, isActive: row.isActive } : r)));
            console.error(e);
        }
    };

    const onResetMonthly = async (row: UserRow) => {
        const prevVal = row.monthlyInspectionCount ?? 0;
        setRows((prev) =>
            prev.map((r) =>
                r.id === row.id
                    ? { ...r, monthlyInspectionCount: 0, lastResetDate: new Date().toISOString() }
                    : r
            )
        );
        try {
            await patchUser(row.id, { monthlyInspectionCount: 0, lastResetDate: new Date().toISOString() });
        } catch (e) {
            setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, monthlyInspectionCount: prevVal } : r)));
            console.error(e);
        }
    };

    const exportCsv = () => downloadText(toCsv(filtered), `users-${Date.now()}.csv`);

    useEffect(() => {
        setPage(1);
    }, [query, pageSize, activeTab]);

    const SortIcon = ({ column }: { column: keyof UserRow }) => {
        if (sortKey !== column) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
        return sortDir === "asc"
            ? <ArrowUp className="ml-2 h-4 w-4" />
            : <ArrowDown className="ml-2 h-4 w-4" />;
    };

    const TableSkeleton = () => (
        <>
            {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell>
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                        </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
            ))}
        </>
    );

    return (
        <TooltipProvider>
            <div className={`space-y-6 ${className ?? ""}`}>
                {/* Header with Stats */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
                            <p className="text-muted-foreground">
                                Manage user accounts and monitor activity
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={refresh}
                            disabled={refreshing}
                        >
                            <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                        </Button>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.total}</div>
                                <p className="text-xs text-muted-foreground">
                                    All registered users
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                                <Shield className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.active}</div>
                                <p className="text-xs text-muted-foreground">
                                    {((stats.active / stats.total) * 100).toFixed(0)}% of total
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Inspections</CardTitle>
                                <Activity className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.totalInspections}</div>
                                <p className="text-xs text-muted-foreground">
                                    Lifetime inspections
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Monthly Inspections</CardTitle>
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.monthlyInspections}</div>
                                <p className="text-xs text-muted-foreground">
                                    Current month activity
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Main Table Card */}
                <Card>
                    <CardHeader>
                        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
                                <TabsList>
                                    <TabsTrigger value="all">
                                        All Users
                                        <Badge variant="secondary" className="ml-2">
                                            {rows.length}
                                        </Badge>
                                    </TabsTrigger>
                                    <TabsTrigger value="active">
                                        Active
                                        <Badge variant="secondary" className="ml-2">
                                            {rows.filter(r => r.isActive).length}
                                        </Badge>
                                    </TabsTrigger>
                                    <TabsTrigger value="inactive">
                                        Inactive
                                        <Badge variant="secondary" className="ml-2">
                                            {rows.filter(r => !r.isActive).length}
                                        </Badge>
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>

                            <Button onClick={exportCsv} variant="outline" size="sm">
                                <Download className="mr-2 h-4 w-4" />
                                Export CSV
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent>
                        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search by email, name, or ID..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(Number(v))}>
                                <SelectTrigger className="w-[130px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[10, 20, 50, 100].map((n) => (
                                        <SelectItem key={n} value={n.toString()}>
                                            {n} per page
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {error && (
                            <Alert variant="destructive" className="mb-4">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">#</TableHead>
                                        <TableHead
                                            className="cursor-pointer"
                                            onClick={() => toggleSort("email")}
                                        >
                                            <div className="flex items-center">
                                                User
                                                <SortIcon column="email" />
                                            </div>
                                        </TableHead>
                                        <TableHead
                                            className="cursor-pointer"
                                            onClick={() => toggleSort("firstName")}
                                        >
                                            <div className="flex items-center">
                                                Name
                                                <SortIcon column="firstName" />
                                            </div>
                                        </TableHead>
                                        <TableHead
                                            className="cursor-pointer"
                                            onClick={() => toggleSort("inspectionCount")}
                                        >
                                            <div className="flex items-center">
                                                Inspections
                                                <SortIcon column="inspectionCount" />
                                            </div>
                                        </TableHead>
                                        <TableHead
                                            className="cursor-pointer"
                                            onClick={() => toggleSort("monthlyInspectionCount")}
                                        >
                                            <div className="flex items-center">
                                                Monthly
                                                <SortIcon column="monthlyInspectionCount" />
                                            </div>
                                        </TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead
                                            className="cursor-pointer"
                                            onClick={() => toggleSort("createdAt")}
                                        >
                                            <div className="flex items-center">
                                                Created
                                                <SortIcon column="createdAt" />
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableSkeleton />
                                    ) : paged.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-24 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Users className="h-8 w-8 text-muted-foreground" />
                                                    <p className="text-sm text-muted-foreground">No users found</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paged.map((user, idx) => (
                                            <TableRow key={user.id}>
                                                <TableCell className="font-medium">
                                                    {(page - 1) * pageSize + idx + 1}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar>
                                                            <AvatarImage src={user.imageUrl || undefined} />
                                                            <AvatarFallback>
                                                                {getInitials(user.firstName, user.lastName, user.email)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <div className="font-medium">{user.email}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {user.clerkUserId}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {user.firstName || user.lastName ? (
                                                        <span>{[user.firstName, user.lastName].filter(Boolean).join(" ")}</span>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">
                                                        {user.inspectionCount ?? 0}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <Badge variant="outline">
                                                            {user.monthlyInspectionCount ?? 0}
                                                        </Badge>
                                                        {user.lastResetDate && (
                                                            <p className="text-xs text-muted-foreground">
                                                                Reset: {formatShortDate(user.lastResetDate)}
                                                            </p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Switch
                                                            checked={user.isActive ?? false}
                                                            onCheckedChange={() => onToggleActive(user)}
                                                        />
                                                        <span className="text-sm">
                                                            {user.isActive ? "Active" : "Inactive"}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="text-sm text-muted-foreground">
                                                                {formatShortDate(user.createdAt)}
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            {formatDate(user.createdAt)}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => onToggleActive(user)}>
                                                                {user.isActive ? (
                                                                    <>
                                                                        <ToggleLeft className="mr-2 h-4 w-4" />
                                                                        Deactivate User
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <ToggleRight className="mr-2 h-4 w-4" />
                                                                        Activate User
                                                                    </>
                                                                )}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => onResetMonthly(user)}>
                                                                <RefreshCcw className="mr-2 h-4 w-4" />
                                                                Reset Monthly Count
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between space-x-2 pt-4">
                            <p className="text-sm text-muted-foreground">
                                Showing {(page - 1) * pageSize + 1} to{" "}
                                {Math.min(page * pageSize, filtered.length)} of {filtered.length} results
                            </p>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setPage(1)}
                                    disabled={page === 1}
                                >
                                    <ChevronsLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>

                                <div className="flex items-center gap-1">
                                    <span className="text-sm">
                                        Page {page} of {pageCount}
                                    </span>
                                </div>

                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                                    disabled={page === pageCount}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setPage(pageCount)}
                                    disabled={page === pageCount}
                                >
                                    <ChevronsRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </TooltipProvider>
    );
};

export default UserManagementTable;