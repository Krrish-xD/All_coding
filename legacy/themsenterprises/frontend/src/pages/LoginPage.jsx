// src/pages/LoginPage.jsx
import { useState, useContext, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FiEye, FiEyeOff, FiMail, FiLock } from 'react-icons/fi';
import { API_BASE } from '../constants/api';
import './AuthForm.css';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [urlError, setUrlError] = useState('');

  const { login, error } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const from = location.state?.from?.pathname || '/';

  // Check for errors in URL params (from OAuth failures)
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setUrlError(decodeURIComponent(errorParam));
      // Clear the error from URL after showing it
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('error');
      navigate({ search: newSearchParams.toString() }, { replace: true });
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    // If already logged in, bounce back
    const token = localStorage.getItem('token');
    if (token) {
      navigate(from, { replace: true });
    }
  }, [navigate, from]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    // Clear URL error when user starts typing
    if (urlError) {
      setUrlError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setUrlError('');

    const result = await login(formData.identifier, formData.password);

    if (result.success) {
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      }
      navigate(from, { replace: true });
    }

    setIsSubmitting(false);
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE}/auth/google`;
  };

  const displayError = urlError || error;

  return (
    <div className="login-page-new">
      <div className="login-container-new">


        {/* Right Column (Form) */}
        <div className="login-form-container">
          <div className="login-header">
            <h2>Sign In</h2>
            <p>Enter your credentials to access your account.</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
                      <div className="form-group">
                        <div className="input-group">
                          <FiMail className="input-icon" />
                          <input
                            name="identifier"
                            value={formData.identifier}
                            onChange={handleChange}
                            placeholder=" "
                            required
                            disabled={isSubmitting}
                          />
                          <label htmlFor="identifier">Email or Username</label>
                        </div>
                      </div>
                      <div className="form-group">
                        <div className="input-group">
                          <FiLock className="input-icon" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder=" "
                            required
                            disabled={isSubmitting}
                          />
                          <label htmlFor="password">Password</label>
                          <button
                            type="button"
                            className="password-toggle"
                            onClick={togglePasswordVisibility}
                            disabled={isSubmitting}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <FiEyeOff /> : <FiEye />}
                          </button>
                        </div>
                      </div>
            <div className="form-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isSubmitting}
                />
                Remember me
              </label>
              <Link to="/forgot-password" className="forgot-password">
                Forgot Password?
              </Link>
            </div>

            {displayError && <div className="error-message">{displayError}</div>}

            <button
              type="submit"
              className="login-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </button>

            <div className="divider">
              <span>or</span>
            </div>

            <button
              type="button"
              className="google-login-button"
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
            >
              <img
                src="https://developers.google.com/identity/images/g-logo.png"
                alt="Google"
                className="google-icon"
              />
              Continue with Google
            </button>

            <p className="signup-prompt">
              Don&apos;t have an account?{" "}
              <Link to="/register" className="register-link">
                Sign up here
              </Link>
            </p>
          </form>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;