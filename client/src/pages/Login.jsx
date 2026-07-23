import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth.jsx';
import './Login.css';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate        = useNavigate();

  useEffect(() => { if (user) navigate('/', { replace: true }); }, [user, navigate]);

  async function handleSuccess(res) {
    try {
      await login(res.credential);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-orb" />
        <div className="login-grid" />
      </div>

      <div className="login-card">
        <div className="login-logo">
          <span className="login-mark">✦</span>
          <span className="login-name">Astric</span>
          <span className="login-tag">Admin</span>
        </div>

        <h1 className="login-title">Welcome back</h1>
        <p className="login-sub">Sign in with your authorised Google account to continue.</p>

        <div className="login-google">
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => toast.error('Google sign-in failed')}
            theme="filled_black"
            shape="rectangular"
            size="large"
            width="280"
            text="signin_with"
          />
        </div>

        <p className="login-note">
          🔒 Access restricted to authorised accounts only.
        </p>
      </div>
    </div>
  );
}
