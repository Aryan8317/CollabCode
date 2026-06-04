import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import InteractiveGrid from '../components/InteractiveGrid';
import { useAuth } from '../utils/AuthContext';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const { forgotPassword, error, isAuthenticated } = useAuth();
  
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await forgotPassword(email);
      setIsSubmitted(true);
      // Wait a bit then navigate
      setTimeout(() => {
        navigate('/reset-password', { state: { email } });
      }, 2000);
    } catch (err) {
      // Error handled by context
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="w-full h-screen flex flex-col items-center justify-center bg-background text-on-surface relative p-4 overflow-x-hidden">
      <InteractiveGrid />
      
      <div className="w-[min(90vw,480px)] glass-surface p-8 sm:p-12 rounded-2xl border border-outline-variant/30 z-10 text-center shadow-2xl">
        <header className="mb-10">
          <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary">
            <span className="material-symbols-outlined text-[32px]">lock_reset</span>
          </div>
          <h1 className="font-geist text-[24px] font-bold text-on-surface mb-2 tracking-tight">Forgot Password</h1>
          <p className="font-geist text-[14px] text-on-surface-variant leading-relaxed px-4">
            Enter your email address and we'll send you an OTP to reset your password.
          </p>
        </header>

        {isSubmitted && (
          <div className="mb-8 p-4 rounded-lg bg-secondary-container text-on-secondary-container text-[13px] font-mono border border-secondary/20 flex items-center gap-3">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span className="flex-1 text-left uppercase">OTP SENT! REDIRECTING...</span>
          </div>
        )}

        {error && (
          <div className="mb-8 p-4 rounded-lg bg-error-container text-on-error-container text-[13px] font-mono border border-error/20 flex items-center gap-3">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span className="flex-1 text-left uppercase">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          <div className="space-y-2">
            <label className="font-mono text-[11px] font-bold text-on-surface-variant block tracking-wider uppercase" htmlFor="email">EMAIL_ADDRESS</label>
            <div className="relative group">
              <input 
                className="w-full bg-transparent border border-outline-variant rounded-lg py-3 px-4 text-on-surface font-geist text-[14px] focus:outline-none focus:ring-2 focus:ring-primary-container focus:border-primary-container transition-all placeholder:text-outline/50" 
                id="email" 
                placeholder="dev@collabcode.io" 
                required 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
              />
              <span className="absolute right-4 top-3.5 material-symbols-outlined text-outline group-focus-within:text-primary transition-colors">alternate_email</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || isSubmitted}
            className={`w-full bg-primary text-on-primary font-mono text-[12px] font-bold py-4 rounded-xl shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-widest ${
              (isLoading || isSubmitted) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? (
              <><span className="material-symbols-outlined animate-spin text-[18px]">sync</span> REQUESTING...</>
            ) : (
              <>SEND_RESET_OTP <span className="material-symbols-outlined text-[18px]">send</span></>
            )}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-outline-variant/20">
          <Link to="/login" className="font-mono text-[12px] text-secondary font-bold hover:underline uppercase tracking-wider">
            Back to Login
          </Link>
        </div>
      </div>
    </main>
  );
};

export default ForgotPassword;
