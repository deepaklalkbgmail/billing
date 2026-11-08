import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, AuthUser } from '@/store/authStore';
import { authAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UtensilsCrossed, Lock, User, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setErrorMessage('');
    setLoading(true);

    try {
      const response = await authAPI.login(username.trim(), password);
      const resData = response.data?.data || response.data;
      const { user, token } = resData;

      if (!token || !user) {
        throw new Error('Invalid response received from server.');
      }

      const authUser: AuthUser = {
        id: user.id,
        username: user.username,
        fullName: user.fullName || user.username,
        role: user.role,
        branchId: user.branchId || null,
        branchName: user.branch?.name || user.branchName || 'Downtown Branch',
      };

      login(authUser, token);
      toast.success(`Welcome back, ${authUser.fullName}!`);

      if (authUser.role === 'CASHIER') {
        navigate('/pos');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Authentication failed. Please verify your credentials.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (demoUser: string, demoPass: string) => {
    setUsername(demoUser);
    setPassword(demoPass);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-4">
      <div className="w-full max-w-md space-y-4">
        <Card className="border-slate-700 bg-slate-900/95 text-slate-100 shadow-2xl backdrop-blur-sm">
          <CardHeader className="space-y-3 text-center pb-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30 ring-4 ring-primary/20">
              <UtensilsCrossed className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight text-white">
                RestoPOS
              </CardTitle>
              <CardDescription className="text-slate-400 mt-1">
                Multi-Branch Restaurant Billing & POS Suite
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/15 p-3 text-sm text-destructive-foreground">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                  <span className="text-red-300 text-xs font-medium">{errorMessage}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-9 bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-primary h-11"
                    disabled={loading}
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-primary h-11"
                    disabled={loading}
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 font-semibold text-base shadow-lg shadow-primary/25"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In to Terminal'
                )}
              </Button>
            </form>

          </CardContent>

          <CardFooter className="justify-center border-t border-slate-800/80 py-3 text-xs text-slate-500">
            Protected POS Terminal &bull; RestoPOS v1.0.0
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

