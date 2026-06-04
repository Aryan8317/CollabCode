import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';

const GoogleCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { googleLogin } = useAuth();
  const hasCalled = React.useRef(false);

  useEffect(() => {
    const code = searchParams.get('code');
    if (code && !hasCalled.current) {
      hasCalled.current = true;
      googleLogin(code)
        .then(() => {
          navigate('/dashboard');
        })
        .catch(() => {
          navigate('/login');
        });
    } else if (!code) {
      navigate('/login');
    }
  }, [searchParams, googleLogin, navigate]);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-background text-on-surface">
      <div className="mb-8">
        <span className="font-geist text-[28px] font-bold text-primary tracking-tight">CollabCode</span>
      </div>
      <div className="flex flex-col items-center gap-4">
        <span className="material-symbols-outlined animate-spin text-[48px] text-primary">sync</span>
        <p className="font-mono text-[14px] uppercase tracking-widest">Authorizing with Google...</p>
      </div>
    </div>
  );
};

export default GoogleCallback;
