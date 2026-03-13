"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { LogIn, UserPlus, Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";

/**
 * Google Sign In Button Component
 */
function GoogleSignInButton({ isLoading, setIsLoading }: { isLoading: boolean; setIsLoading: (v: boolean) => void }) {
    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        try {
            await signIn("google", { 
                callbackUrl: "/chat",
                redirect: true 
            });
        } catch (error) {
            toast.error("Google sign-in failed. Please try again.");
            setIsLoading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 font-medium py-2.5 px-4 rounded-lg border border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 dark:border-gray-600"
        >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
            </svg>
            Sign in with Google
        </button>
    );
}

export default function AuthPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnTo = searchParams.get("returnTo") || "/chat";
    const { login, register } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        name: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (isLogin) {
                // Login
                await login(formData.email, formData.password);

                toast.success("Login successful!");
                router.push(returnTo);
            } else {
                // Register
                await register(formData.email, formData.password, formData.name);

                toast.success("Registration successful! Please log in.");
                setIsLogin(true);
                setFormData({ ...formData, password: "" });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Authentication failed";
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                        Interview Prep Tracker
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Track your interview preparation journey
                    </p>
                </div>

                {/* Auth Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
                    {/* Toggle Tabs */}
                    <div className="flex gap-2 mb-6 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <button
                            onClick={() => setIsLogin(true)}
                            className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${isLogin
                                ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm"
                                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                }`}
                        >
                            <LogIn className="w-4 h-4 inline mr-2" />
                            Login
                        </button>
                        <button
                            onClick={() => setIsLogin(false)}
                            className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${!isLogin
                                ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm"
                                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                }`}
                        >
                            <UserPlus className="w-4 h-4 inline mr-2" />
                            Register
                        </button>
                    </div>

                    {/* Google Sign In - Only show on Login */}
                    {isLogin && (
                        <div className="mb-6">
                            <GoogleSignInButton isLoading={isLoading} setIsLoading={setIsLoading} />
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                        Or continue with email
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    required={!isLogin}
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, name: e.target.value })
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    placeholder="John Doe"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) =>
                                    setFormData({ ...formData, email: e.target.value })
                                }
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Password
                            </label>
                            <input
                                type="password"
                                required
                                value={formData.password}
                                onChange={(e) =>
                                    setFormData({ ...formData, password: e.target.value })
                                }
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                placeholder="••••••••"
                                minLength={6}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {isLogin ? "Logging in..." : "Registering..."}
                                </>
                            ) : (
                                <>
                                    {isLogin ? (
                                        <>
                                            <LogIn className="w-4 h-4" />
                                            Login
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="w-4 h-4" />
                                            Register
                                        </>
                                    )}
                                </>
                            )}
                        </button>
                    </form>

                    {/* Demo Credentials */}
                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-2">
                            Demo Account
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-400">
                            Email: <code className="bg-blue-100 dark:bg-blue-900/40 px-1 py-0.5 rounded">john.doe@example.com</code>
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-400">
                            Password: <code className="bg-blue-100 dark:bg-blue-900/40 px-1 py-0.5 rounded">TestPassword123!</code>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
                    Ace your interviews with structured preparation
                </p>
            </div>
        </div>
    );
}
