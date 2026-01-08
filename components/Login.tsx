'use client';

import { useState, useEffect } from 'react';

interface LoginProps {
    title?: string;
    loginType: 'dac' | 'datasource';
    onLoginSuccess: (data: { cookie: string, username: string }) => void;
}

export default function Login({ title, loginType, onLoginSuccess }: LoginProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [cookieInput, setCookieInput] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Auto-login effect for DAC
    useEffect(() => {
        if (loginType === 'dac') {
            const savedUser = localStorage.getItem('username');
            const savedPass = localStorage.getItem('dac_password');

            if (savedUser && savedPass) {
                setUsername(savedUser);
                setPassword(savedPass);
                performDacLogin(savedUser, savedPass);
            }
        }
    }, [loginType]);

    const performDacLogin = async (u: string, p: string) => {
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: u, password: p, type: 'dac' }),
            });

            const data = await res.json();

            if (data.success) {
                // Save password for future auto-logins
                localStorage.setItem('dac_password', p);

                let sessionValue = '';
                if (data.cookie) {
                    const match = data.cookie.match(/ci_session=([^;]+)/);
                    if (match && match[1]) {
                        sessionValue = match[1];
                    } else {
                        sessionValue = data.cookie;
                    }
                }
                onLoginSuccess({ cookie: sessionValue, username: u });
            } else {
                setError(data.message || 'Login failed');
                // Optional: clear invalid password to prevent loop? 
                // But user might want to see it filled. 
                // We won't clear it from storage yet, just let them correct it.
            }
        } catch (err) {
            setError('An error occurred during auto-login.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (loginType === 'datasource') {
            // Direct cookie input mode
            const input = cookieInput.trim();
            if (!input) {
                setError('Cookie cannot be empty');
                setLoading(false);
                return;
            }

            // User forces correct input, no parsing needed
            onLoginSuccess({ cookie: input, username: 'manual-cookie' });
            setLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password, type: loginType }),
            });

            const data = await res.json();

            if (data.success) {
                let sessionValue = '';

                if (data.cookie) {
                    // Try to parse just the ID, but keep full string if needed or fallback
                    const match = data.cookie.match(/ci_session=([^;]+)/);
                    if (match && match[1]) {
                        sessionValue = match[1];
                    } else {
                        // Fallback: If regex fails, assume maybe the whole thing is useful or let parent decide
                        sessionValue = data.cookie;
                    }
                }

                // Pass back the session data
                onLoginSuccess({ cookie: sessionValue, username });

            } else {
                setError(data.message || 'Login failed');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
                <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
                    {title || 'Login'}
                </h2>
                {error && (
                    <div className="p-3 text-sm text-red-500 bg-red-100 rounded dark:bg-red-900/30 dark:text-red-400">
                        {error}
                    </div>
                )}

                {loginType === 'datasource' ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                                Paste asshal.tech Cookie Here
                            </label>
                            <textarea
                                value={cookieInput}
                                onChange={(e) => setCookieInput(e.target.value)}
                                className="w-full p-2.5 text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white h-32"
                                placeholder="Paste the full cookie string here..."
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 disabled:opacity-50"
                        >
                            Set Cookie
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full p-2.5 text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-2.5 text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 disabled:opacity-50"
                        >
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
