// src/SignIn.tsx
import { type FormEvent, useState } from "react";
import { useSignIn } from "@clerk/react-router";
import { useNavigate, useLocation } from "react-router";
import { z } from "zod";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Loader2, Mail } from "lucide-react";

// --- Zod schemas (unchanged) ---
const signInSchema = z.object({
    identifier: z.string().trim().refine(
        (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || v.length >= 3,
        { message: "Enter a valid email or username (min 3 characters)" }
    ),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

const forgotRequestSchema = z.object({
    email: z.string().trim().email("Enter a valid email"),
});

const forgotResetSchema = z.object({
    code: z.string().trim().min(4, "Enter the code we sent"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

type SignInErrors = Partial<Record<keyof z.infer<typeof signInSchema>, string>>;
type ForgotReqErrors = Partial<Record<keyof z.infer<typeof forgotRequestSchema>, string>>;
type ForgotResetErrors = Partial<Record<keyof z.infer<typeof forgotResetSchema>, string>>;

export function Login() {
    const { isLoaded, signIn: {attemptFirstFactor, authenticateWithRedirect, create}, setActive } = useSignIn();

    // sign-in state
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState<SignInErrors>({});
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // forgot password state
    const [mode, setMode] = useState<"signin" | "forgot_request" | "forgot_reset">("signin");
    const [fpEmail, setFpEmail] = useState("");
    const [fpReqErrors, setFpReqErrors] = useState<ForgotReqErrors>({});
    const [fpCode, setFpCode] = useState("");
    const [fpNewPwd, setFpNewPwd] = useState("");
    const [fpResetErrors, setFpResetErrors] = useState<ForgotResetErrors>({});
    const [fpError, setFpError] = useState<string | null>(null);
    const [fpSubmitting, setFpSubmitting] = useState(false);

    const nav = useNavigate();
    const loc = useLocation();
    const redirectTo = (loc.state as any)?.from || "/";

    if (!isLoaded) return null;

    // --- submit sign-in ---
    async function onSubmit(e: FormEvent) {
        e.preventDefault();
        setSubmitError(null);
        const parsed = signInSchema.safeParse({ identifier, password });
        if (!parsed.success) {
            const flat = parsed.error.flatten().fieldErrors;
            setErrors({ identifier: flat.identifier?.[0], password: flat.password?.[0] });
            return;
        }
        try {
            setSubmitting(true);
            const res = await create({ identifier: parsed.data.identifier, password: parsed.data.password });
            if (res.status === "complete") {
                await setActive({ session: res.createdSessionId });
                nav(redirectTo, { replace: true });
            } else {
                console.log("Next step:", res);
            }
        } catch (err: any) {
            setSubmitError(err?.errors?.[0]?.message ?? "Sign-in failed");
        } finally {
            setSubmitting(false);
        }
    }

    // --- forgot: request code ---
    async function onForgotRequest(e: FormEvent) {
        e.preventDefault();
        setFpError(null);
        const parsed = forgotRequestSchema.safeParse({ email: fpEmail });
        if (!parsed.success) {
            const flat = parsed.error.flatten().fieldErrors;
            setFpReqErrors({ email: flat.email?.[0] });
            return;
        }
        try {
            setFpSubmitting(true);
            await create({ strategy: "reset_password_email_code", identifier: parsed.data.email });
            setMode("forgot_reset");
        } catch (err: any) {
            setFpError(err?.errors?.[0]?.message ?? "Couldn’t send reset code");
        } finally {
            setFpSubmitting(false);
        }
    }

    // --- forgot: verify + new password ---
    async function onForgotReset(e: FormEvent) {
        e.preventDefault();
        setFpError(null);
        const parsed = forgotResetSchema.safeParse({ code: fpCode, newPassword: fpNewPwd });
        if (!parsed.success) {
            const flat = parsed.error.flatten().fieldErrors;
            setFpResetErrors({ code: flat.code?.[0], newPassword: flat.newPassword?.[0] });
            return;
        }
        try {
            setFpSubmitting(true);
            const res = await attemptFirstFactor({
                strategy: "reset_password_email_code",
                code: parsed.data.code,
                password: parsed.data.newPassword,
            });
            if (res.status === "complete") {
                await setActive({ session: res.createdSessionId });
                nav(redirectTo, { replace: true });
            } else {
                setFpError("Additional verification required.");
            }
        } catch (err: any) {
            setFpError(err?.errors?.[0]?.message ?? "Reset failed");
        } finally {
            setFpSubmitting(false);
        }
    }

    return (
        <div className="grid min-h-screen place-items-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl">
                        {mode === "signin" ? "Welcome back" : mode === "forgot_request" ? "Reset your password" : "Enter code & new password"}
                    </CardTitle>
                    <CardDescription>
                        {mode === "signin"
                            ? "Sign in to your account"
                            : mode === "forgot_request"
                                ? "We’ll email you a reset code"
                                : "Check your email for the code"}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    {mode === "signin" && (
                        <form onSubmit={onSubmit} noValidate className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="identifier">Email or username</Label>
                                <Input
                                    id="identifier"
                                    value={identifier}
                                    onChange={(e) => {
                                        setIdentifier(e.target.value);
                                        if (errors.identifier) setErrors((p) => ({ ...p, identifier: undefined }));
                                    }}
                                    aria-invalid={!!errors.identifier}
                                    aria-describedby={errors.identifier ? "identifier-error" : undefined}
                                    placeholder="you@example.com"
                                />
                                {errors.identifier && (
                                    <p id="identifier-error" className="text-sm text-destructive">
                                        {errors.identifier}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
                                    }}
                                    aria-invalid={!!errors.password}
                                    aria-describedby={errors.password ? "password-error" : undefined}
                                    placeholder="••••••••"
                                />
                                {errors.password && (
                                    <p id="password-error" className="text-sm text-destructive">
                                        {errors.password}
                                    </p>
                                )}
                            </div>

                            {submitError && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Sign-in failed</AlertTitle>
                                    <AlertDescription>{submitError}</AlertDescription>
                                </Alert>
                            )}

                            <Button type="submit" className="w-full" disabled={submitting}>
                                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Sign in
                            </Button>

                            <div className="relative">
                                <Separator />
                                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                  or
                </span>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() =>
                                    authenticateWithRedirect({
                                        strategy: "oauth_google",
                                        redirectUrl: "/sso-callback",
                                        redirectUrlComplete: redirectTo,
                                    })
                                }
                            >
                                {/* simple Google glyph */}
                                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M12 11v3.6h7.3c-.3 1.9-2.2 5.6-7.3 5.6-4.4 0-8-3.6-8-8s3.6-8 8-8c2.5 0 4.2 1.1 5.2 2l3.6-3.6C19.6 0.8 16.9 0 14 0 6.3 0 0 6.3 0 14s6.3 14 14 14 14-6.3 14-14c0-.9-.1-1.8-.3-2.7H12z" fill="currentColor" />
                                </svg>
                                Continue with Google
                            </Button>

                            <div className="text-right">
                                <Button type="button" variant="link" className="px-0" onClick={() => setMode("forgot_request")}>
                                    Forgot password?
                                </Button>
                            </div>
                        </form>
                    )}

                    {mode === "forgot_request" && (
                        <form onSubmit={onForgotRequest} noValidate className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="fp-email">Email</Label>
                                <div className="relative">
                                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="fp-email"
                                        type="email"
                                        className="pl-9"
                                        placeholder="you@example.com"
                                        value={fpEmail}
                                        onChange={(e) => {
                                            setFpEmail(e.target.value);
                                            if (fpReqErrors.email) setFpReqErrors({});
                                        }}
                                        aria-invalid={!!fpReqErrors.email}
                                        aria-describedby={fpReqErrors.email ? "fp-email-error" : undefined}
                                    />
                                </div>
                                {fpReqErrors.email && (
                                    <p id="fp-email-error" className="text-sm text-destructive">
                                        {fpReqErrors.email}
                                    </p>
                                )}
                            </div>

                            {fpError && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Couldn’t send code</AlertTitle>
                                    <AlertDescription>{fpError}</AlertDescription>
                                </Alert>
                            )}

                            <div className="flex gap-2">
                                <Button type="button" variant="ghost" className="flex-1" onClick={() => setMode("signin")}>
                                    Back
                                </Button>
                                <Button type="submit" className="flex-1" disabled={fpSubmitting}>
                                    {fpSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Send reset code
                                </Button>
                            </div>
                        </form>
                    )}

                    {mode === "forgot_reset" && (
                        <form onSubmit={onForgotReset} noValidate className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="fp-code">Reset code</Label>
                                <Input
                                    id="fp-code"
                                    placeholder="123456"
                                    value={fpCode}
                                    onChange={(e) => {
                                        setFpCode(e.target.value);
                                        if (fpResetErrors.code) setFpResetErrors((p) => ({ ...p, code: undefined }));
                                    }}
                                    aria-invalid={!!fpResetErrors.code}
                                    aria-describedby={fpResetErrors.code ? "fp-code-error" : undefined}
                                />
                                {fpResetErrors.code && (
                                    <p id="fp-code-error" className="text-sm text-destructive">
                                        {fpResetErrors.code}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="fp-newpwd">New password</Label>
                                <Input
                                    id="fp-newpwd"
                                    type="password"
                                    placeholder="••••••••"
                                    value={fpNewPwd}
                                    onChange={(e) => {
                                        setFpNewPwd(e.target.value);
                                        if (fpResetErrors.newPassword) setFpResetErrors((p) => ({ ...p, newPassword: undefined }));
                                    }}
                                    aria-invalid={!!fpResetErrors.newPassword}
                                    aria-describedby={fpResetErrors.newPassword ? "fp-newpass-error" : undefined}
                                />
                                {fpResetErrors.newPassword && (
                                    <p id="fp-newpass-error" className="text-sm text-destructive">
                                        {fpResetErrors.newPassword}
                                    </p>
                                )}
                            </div>

                            {fpError && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Reset failed</AlertTitle>
                                    <AlertDescription>{fpError}</AlertDescription>
                                </Alert>
                            )}

                            <div className="flex gap-2">
                                <Button type="button" variant="ghost" className="flex-1" onClick={() => setMode("signin")}>
                                    Back
                                </Button>
                                <Button type="submit" className="flex-1" disabled={fpSubmitting}>
                                    {fpSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Reset password
                                </Button>
                            </div>
                        </form>
                    )}
                </CardContent>

                <CardFooter className="justify-center text-sm text-muted-foreground">
                    By continuing, you agree to our Terms & Privacy.
                </CardFooter>
            </Card>
        </div>
    );
}