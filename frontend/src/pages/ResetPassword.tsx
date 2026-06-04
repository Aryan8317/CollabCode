import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import InteractiveGrid from '../components/InteractiveGrid';
import { useAuth } from '../utils/AuthContext';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetPassword, error, isAuthenticated } = useAuth();
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const email = location.state?.email;

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
    if (!email) {
      navigate('/forgot-password');
    }
  }, [isAuthenticated, email, navigate]);

  const handleOtpChange = (element: any, index: number) => {
    if (isNaN(element.value)) return false;
    setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);
    if (element.nextSibling && element.value !== '') {
      element.nextSibling.focus();
    }
  };

  const handleOtpKeyDown = (e: any, index: number) => {
    if (e.key === 'Backspace') {
      if (otp[index] === '' && e.target.previousSibling) {
        e.target.previousSibling.focus();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return; // Handled by UI feedback if needed, but the button should ideally be disabled
    }
    const otpCode = otp.join('');
    if (otpCode.length !== 6) return;

    setIsLoading(true);
    try {
      await resetPassword(email, otpCode, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      // Error handled by context
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="w-full h-screen flex flex-col items-center justify-center bg-background text-on-surface relative p-4 overflow-y-auto overflow-x-hidden">
      <InteractiveGrid />
      
      <div className="w-[min(90vw,480px)] glass-surface p-6 sm:p-10 rounded-2xl border border-outline-variant/30 z-10 text-center shadow-2xl my-8">
        <header className="mb-8">
          <div className="mb-6 inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-secondary/10 text-secondary">
            <span className="material-symbols-outlined text-[32px]">security</span>
          </div>
          <h1 className="font-geist text-[24px] font-bold text-on-surface mb-2 tracking-tight">Reset Password</h1>
          <p className="font-geist text-[14px] text-on-surface-variant leading-relaxed px-4">
            Enter the code sent to <span className="text-primary font-medium">{email}</span> and your new password.
          </p>
        </header>

        {success && (
          <div className="mb-8 p-4 rounded-lg bg-secondary-container text-on-secondary-container text-[13px] font-mono border border-secondary/20 flex items-center gap-3">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span className="flex-1 text-left uppercase">PASSWORD RESET SUCCESSFUL! REDIRECTING TO LOGIN...</span>
          </div>
        )}

        {error && (
          <div className="mb-8 p-4 rounded-lg bg-error-container text-on-error-container text-[13px] font-mono border border-error/20 flex items-center gap-3">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span className="flex-1 text-left uppercase">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          <div className="space-y-3">
            <label className="font-mono text-[11px] font-bold text-on-surface-variant block tracking-wider uppercase">Verification OTP</label>
            <div className="grid grid-cols-6 gap-2">
              {otp.map((data, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength={1}
                  className="w-full h-12 text-center text-[20px] font-bold font-mono bg-surface-container border-2 border-outline-variant rounded-xl focus:outline-none focus:border-primary transition-all text-on-surface min-w-0"
                  value={data}
                  onChange={(e) => handleOtpChange(e.target, index)}
                  onKeyDown={(e) => handleOtpKeyDown(e, index)}
                  autoFocus={index === 0}
                />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="font-mono text-[11px] font-bold text-on-surface-variant block tracking-wider uppercase" htmlFor="password">NEW_PASSWORD</label>
              <div className="relative group">
                <input 
                  className="w-full bg-transparent border border-outline-variant rounded-lg py-3 px-4 text-on-surface font-geist text-[14px] focus:outline-none focus:ring-2 focus:ring-primary-container focus:border-primary-container transition-all" 
                  id="password" 
                  placeholder="••••••••" 
                  required 
                  type={showPassword ? 'text' : 'password'} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                />
                <button className="absolute right-4 top-3.5 material-symbols-outlined text-outline hover:text-on-surface" type="button" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? 'visibility_off' : 'visibility'}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-mono text-[11px] font-bold text-on-surface-variant block tracking-wider uppercase" htmlFor="confirmPassword">CONFIRM_PASSWORD</label>
              <div className="relative group">
                <input 
                  className="w-full bg-transparent border border-outline-variant rounded-lg py-3 px-4 text-on-surface font-geist text-[14px] focus:outline-none focus:ring-2 focus:ring-primary-container focus:border-primary-container transition-all" 
                  id="confirmPassword" 
                  placeholder="••••••••" 
                  required 
                  type={showPassword ? 'text' : 'password'} 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="font-mono text-[10px] text-error mt-1 uppercase">Passwords do not match</p>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || success || password !== confirmPassword || otp.join('').length !== 6}
            className={`w-full bg-primary text-on-primary font-mono text-[12px] font-bold py-4 rounded-xl shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-widest ${
              (isLoading || success || password !== confirmPassword || otp.join('').length !== 6) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? (
              <><span className="material-symbols-outlined animate-spin text-[18px]">sync</span> UPDATING...</>
            ) : (
              <>UPDATE_PASSWORD <span className="material-symbols-outlined text-[18px]">change_circle</span></>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-outline-variant/20">
          <Link to="/login" className="font-mono text-[12px] text-outline font-bold hover:text-on-surface transition-colors uppercase tracking-wider">
            Cancel
          </Link>
        </div>
      </div>
    </main>
  );
};

export default ResetPassword;
