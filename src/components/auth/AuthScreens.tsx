import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Eye, EyeOff, Check, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';

export const AuthScreens: React.FC = () => {
  const { authView, setAuthView, login, loginWithGoogle, signup, resetPassword, quickDemoLogin } =
    useApp();

  // Login form state
  const [loginEmail, setLoginEmail] = useState('matteollanora@gmail.com');
  const [loginPassword, setLoginPassword] = useState('password123');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [isSigningUp, setIsSigningUp] = useState(false);

  // Forgot password form state
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<{ isError: boolean; message: string } | null>(
    null
  );

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const res = await login(loginEmail, loginPassword);
      if (!res.success) {
        setLoginError(res.error || 'Login failed. Please check credentials.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoginError(null);
    setSignupError(null);
    setIsGoogleLoading(true);
    try {
      const res = await loginWithGoogle();
      if (!res.success) {
        if (authView === 'signup') {
          setSignupError(res.error || 'Google Sign-In failed.');
        } else {
          setLoginError(res.error || 'Google Sign-In failed.');
        }
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);

    if (!agreeTerms) {
      setSignupError('Please agree to the Terms and Privacy Policy to continue.');
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setSignupError('Passwords do not match. Please re-enter your password.');
      return;
    }

    setIsSigningUp(true);
    try {
      const res = await signup(signupName, signupEmail, signupPassword);
      if (!res.success) {
        setSignupError(res.error || 'Failed to create account.');
      }
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetFeedback(null);
    setIsResetting(true);
    try {
      const res = await resetPassword(resetEmail);
      if (res.success) {
        setResetFeedback({ isError: false, message: res.message });
        setTimeout(() => {
          setAuthView('login');
        }, 2500);
      } else {
        setResetFeedback({ isError: true, message: res.message });
      }
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[var(--brand-cream)] flex flex-col justify-center items-center px-4 py-8 sm:py-12 select-none">
      <div className="w-full max-w-md">
        {/* Brand Card Header */}
        <div className="text-center mb-6">
          <BrandLogo size="xl" className="mx-auto mb-3 shadow-lg shadow-[#F47A18]/15" />
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#172337] tracking-tight">
            {authView === 'login' && 'Welcome to Quizian'}
            {authView === 'signup' && 'Create your account'}
            {authView === 'forgot_password' && 'Reset your password'}
          </h1>
          <p className="text-sm text-[#202B3C]/70 mt-1 font-medium">
            Review smarter, not harder.
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-[#EBE7DF]">
          {/* LOGIN SCREEN */}
          {authView === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-200">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#172337] uppercase tracking-wider mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 rounded-xl bg-[#F7F4EF] border border-[#E8E4DC] text-[#202B3C] placeholder-[#202B3C]/40 text-sm focus:outline-none focus:border-[#F47A18] focus:bg-white transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#172337] uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(loginEmail);
                      setResetFeedback(null);
                      setAuthView('forgot_password');
                    }}
                    className="text-xs font-semibold text-[#F47A18] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 pr-11 rounded-xl bg-[#F7F4EF] border border-[#E8E4DC] text-[#202B3C] placeholder-[#202B3C]/40 text-sm focus:outline-none focus:border-[#F47A18] focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#202B3C]/50 hover:text-[#172337] transition-colors cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn || isGoogleLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-[#F47A18] hover:bg-[#e0690f] text-white font-bold text-sm shadow-md shadow-[#F47A18]/25 transition-all cursor-pointer mt-2 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isLoggingIn && <Loader2 size={16} className="animate-spin" />}
                <span>{isLoggingIn ? 'Signing in...' : 'Log in'}</span>
              </button>

              <div className="relative flex items-center justify-center py-2">
                <div className="border-t border-[#E8E4DC] w-full" />
                <span className="bg-white px-3 text-xs text-[#202B3C]/50 font-bold uppercase tracking-wider">
                  OR
                </span>
                <div className="border-t border-[#E8E4DC] w-full" />
              </div>

              {/* Real Firebase Google Sign-in */}
              <button
                type="button"
                disabled={isGoogleLoading || isLoggingIn}
                onClick={handleGoogleSignIn}
                className="w-full py-3 px-4 rounded-xl border border-[#E8E4DC] hover:bg-[#F7F4EF] text-[#202B3C] font-semibold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-60"
              >
                {isGoogleLoading ? (
                  <Loader2 size={16} className="animate-spin text-[#F47A18]" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>{isGoogleLoading ? 'Connecting with Google...' : 'Continue with Google'}</span>
              </button>

              {/* Fast Offline/Preview Test Buttons */}
              <div className="pt-2">
                <p className="text-[11px] text-center text-[#202B3C]/60 mb-2 font-medium">
                  Offline / Preview Demo Accounts (Local Storage):
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => quickDemoLogin('matteollanora@gmail.com')}
                    className="py-2 px-2.5 rounded-lg bg-[#FFF0E3] hover:bg-[#ffe4cc] text-[#F47A18] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Student: Matteo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => quickDemoLogin('sarah.chen@campus.edu')}
                    className="py-2 px-2.5 rounded-lg bg-[#F0EEE9] hover:bg-[#E5E2DA] text-[#172337] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Student: Sarah</span>
                  </button>
                </div>
              </div>

              {/* Link to Signup */}
              <div className="text-center pt-2">
                <p className="text-xs text-[#202B3C]/70">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setSignupError(null);
                      setAuthView('signup');
                    }}
                    className="font-bold text-[#F47A18] hover:underline cursor-pointer"
                  >
                    Sign up
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* SIGN UP SCREEN */}
          {authView === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="space-y-3.5">
              {signupError && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-200">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{signupError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#172337] uppercase tracking-wider mb-1">
                  Full name
                </label>
                <input
                  type="text"
                  required
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F7F4EF] border border-[#E8E4DC] text-[#202B3C] placeholder-[#202B3C]/40 text-sm focus:outline-none focus:border-[#F47A18] focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#172337] uppercase tracking-wider mb-1">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F7F4EF] border border-[#E8E4DC] text-[#202B3C] placeholder-[#202B3C]/40 text-sm focus:outline-none focus:border-[#F47A18] focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#172337] uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showSignupPassword ? 'text' : 'password'}
                    required
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Create a password (min 6 chars)"
                    className="w-full px-4 py-2.5 pr-11 rounded-xl bg-[#F7F4EF] border border-[#E8E4DC] text-[#202B3C] placeholder-[#202B3C]/40 text-sm focus:outline-none focus:border-[#F47A18] focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#202B3C]/50 hover:text-[#172337] cursor-pointer"
                  >
                    {showSignupPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#172337] uppercase tracking-wider mb-1">
                  Confirm password
                </label>
                <input
                  type={showSignupPassword ? 'text' : 'password'}
                  required
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F7F4EF] border border-[#E8E4DC] text-[#202B3C] placeholder-[#202B3C]/40 text-sm focus:outline-none focus:border-[#F47A18] focus:bg-white transition-all"
                />
              </div>

              {/* Terms Checkbox */}
              <label className="flex items-start gap-2.5 pt-1 text-xs text-[#202B3C]/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 rounded text-[#F47A18] focus:ring-[#F47A18]"
                />
                <span>
                  I agree to the <span className="font-semibold text-[#172337] underline">Terms of Service</span> and{' '}
                  <span className="font-semibold text-[#172337] underline">Privacy Policy</span>.
                </span>
              </label>

              <button
                type="submit"
                disabled={isSigningUp || isGoogleLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-[#F47A18] hover:bg-[#e0690f] text-white font-bold text-sm shadow-md shadow-[#F47A18]/25 transition-all cursor-pointer mt-2 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSigningUp && <Loader2 size={16} className="animate-spin" />}
                <span>{isSigningUp ? 'Creating account...' : 'Create account'}</span>
              </button>

              <div className="relative flex items-center justify-center py-1">
                <div className="border-t border-[#E8E4DC] w-full" />
                <span className="bg-white px-3 text-[11px] text-[#202B3C]/50 font-bold uppercase tracking-wider">
                  OR
                </span>
                <div className="border-t border-[#E8E4DC] w-full" />
              </div>

              <button
                type="button"
                disabled={isGoogleLoading || isSigningUp}
                onClick={handleGoogleSignIn}
                className="w-full py-2.5 px-4 rounded-xl border border-[#E8E4DC] hover:bg-[#F7F4EF] text-[#202B3C] font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
              >
                <span>Sign up with Google</span>
              </button>

              <div className="text-center pt-2">
                <p className="text-xs text-[#202B3C]/70">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setLoginError(null);
                      setAuthView('login');
                    }}
                    className="font-bold text-[#F47A18] hover:underline cursor-pointer"
                  >
                    Log in
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* FORGOT PASSWORD */}
          {authView === 'forgot_password' && (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <button
                type="button"
                onClick={() => setAuthView('login')}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#202B3C]/70 hover:text-[#172337] mb-2 cursor-pointer"
              >
                <ArrowLeft size={16} /> Back to Log in
              </button>

              <p className="text-xs text-[#202B3C]/80 leading-relaxed">
                Enter your registered email address and Firebase will send a secure password reset link to your inbox.
              </p>

              {resetFeedback && (
                <div
                  className={`flex items-start gap-2.5 p-3 rounded-xl text-xs font-medium border ${
                    resetFeedback.isError
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-[#239B70]/10 text-[#239B70] border-[#239B70]/20'
                  }`}
                >
                  {resetFeedback.isError ? (
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  ) : (
                    <Check size={16} className="shrink-0 mt-0.5" />
                  )}
                  <span>{resetFeedback.message}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#172337] uppercase tracking-wider mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Enter your registered email"
                  className="w-full px-4 py-3 rounded-xl bg-[#F7F4EF] border border-[#E8E4DC] text-[#202B3C] placeholder-[#202B3C]/40 text-sm focus:outline-none focus:border-[#F47A18] focus:bg-white transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isResetting}
                className="w-full py-3.5 px-4 rounded-xl bg-[#F47A18] hover:bg-[#e0690f] text-white font-bold text-sm shadow-md shadow-[#F47A18]/25 transition-all cursor-pointer mt-2 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isResetting && <Loader2 size={16} className="animate-spin" />}
                <span>{isResetting ? 'Sending reset link...' : 'Send Password Reset Email'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Footer tagline */}
        <p className="text-center text-xs text-[#202B3C]/50 mt-6 font-medium">
          Learn • Challenge • Grow • Quizian © 2026
        </p>
      </div>
    </div>
  );
};
