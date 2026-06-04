import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import InteractiveGrid from '../components/InteractiveGrid';
import { useAuth } from '../utils/AuthContext';

const VerifyEmail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyOTP, resendOTP, error, isAuthenticated } = useAuth();
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const email = location.state?.email;

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
    if (!email) {
      navigate('/signup');
    }
  }, [isAuthenticated, email, navigate]);

  useEffect(() => {
    let timer: any;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const handleChange = (element: any, index: number) => {
    if (isNaN(element.value)) return false;

    setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);

    // Focus next input
    if (element.nextSibling && element.value !== '') {
      element.nextSibling.focus();
    }
  };

  const handleKeyDown = (e: any, index: number) => {
    if (e.key === 'Backspace') {
      if (otp[index] === '' && e.target.previousSibling) {
        e.target.previousSibling.focus();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length !== 6) return;

    setIsLoading(true);
    try {
      await verifyOTP(email, otpCode);
      navigate('/dashboard');
    } catch (err) {
      // Error handled by context
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    try {
      await resendOTP(email);
      setSuccessMessage('A new OTP has been sent to your email.');
      setResendTimer(30);
      setCanResend(false);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      // Error handled by context
    }
  };

  return (
    <main className="w-full h-screen flex flex-col items-center justify-center bg-background text-on-surface relative p-4 overflow-x-hidden box-border">
      <InteractiveGrid />
      
      <div className="w-[min(90vw,480px)] glass-surface p-6 sm:p-8 md:p-12 rounded-2xl border border-outline-variant/30 z-10 text-center shadow-2xl overflow-hidden box-border">
        <header className="mb-8">
          <div className="mb-6 inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10 text-primary">
            <span className="material-symbols-outlined text-[28px] sm:text-[32px]">mark_email_read</span>
          </div>
          <h1 className="font-geist text-[20px] sm:text-[24px] font-bold text-on-surface mb-2 tracking-tight">Verify Your Email</h1>
          <p className="font-geist text-[13px] sm:text-[14px] text-on-surface-variant leading-relaxed break-words px-2">
            We've sent a 6-digit code to <span className="text-primary font-medium break-all">{email}</span>. Please enter it below to verify your account.
          </p>
        </header>

        {(error || successMessage) && (
          <div className={`mb-6 p-4 rounded-lg text-[12px] sm:text-[13px] font-mono border flex items-center gap-3 ${
            error 
              ? 'bg-error-container text-on-error-container border-error/20' 
              : 'bg-secondary-container text-on-secondary-container border-secondary/20'
          }`}>
            <span className="material-symbols-outlined text-[18px]">
              {error ? 'error' : 'check_circle'}
            </span>
            <span className="flex-1 text-left break-words">{error ? error.toUpperCase() : successMessage.toUpperCase()}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 w-full">
          <div className="grid grid-cols-6 gap-2 sm:gap-3 md:gap-4 w-full justify-center">
            {otp.map((data, index) => (
              <input
                key={index}
                type="text"
                maxLength={1}
                className="w-full h-11 sm:h-14 md:h-16 text-center text-[18px] sm:text-[22px] md:text-[24px] font-bold font-mono bg-surface-container border-2 border-outline-variant rounded-lg sm:rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-on-surface min-w-0"
                value={data}
                onChange={(e) => handleChange(e.target, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onFocus={(e) => e.target.select()}
                autoFocus={index === 0}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={isLoading || otp.join('').length !== 6}
            className={`w-full bg-primary text-on-primary font-mono text-[11px] sm:text-[12px] font-bold py-3 sm:py-4 rounded-xl shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-widest ${
              (isLoading || otp.join('').length !== 6) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? (
              <><span className="material-symbols-outlined animate-spin text-[18px]">sync</span> VERIFYING...</>
            ) : (
              <>VERIFY_ACCOUNT <span className="material-symbols-outlined text-[18px]">verified</span></>
            )}
          </button>
        </form>

        <div className="mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-outline-variant/20">
          <p className="font-geist text-[13px] sm:text-[14px] text-on-surface-variant">
            Didn't receive the code?
          </p>
          <button
            onClick={handleResend}
            disabled={!canResend}
            className={`mt-2 font-mono text-[11px] sm:text-[12px] font-bold uppercase tracking-wider transition-colors ${
              canResend ? 'text-secondary hover:text-secondary-high underline' : 'text-outline'
            }`}
          >
            {canResend ? 'RESEND_CODE_NOW' : `RESEND_CODE_IN_${resendTimer}S`}
          </button>
        </div>
      </div>
    </main>
  );
};

export default VerifyEmail;
