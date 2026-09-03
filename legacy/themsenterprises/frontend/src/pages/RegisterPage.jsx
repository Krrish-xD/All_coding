import { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { AuthContext } from '../context/AuthContext';
import { PopupContext } from '../context/PopupContext';
import './AuthForm.css';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    level: 'none',
    feedback: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  const { register, error } = useContext(AuthContext);
  const { showPopup } = useContext(PopupContext);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  // Password strength checker
  useEffect(() => {
    const checkPasswordStrength = (password) => {
      let score = 0;
      let feedback = [];

      if (password.length >= 8) {
        score += 1;
      } else {
        feedback.push('At least 8 characters');
      }

      if (/[a-z]/.test(password)) {
        score += 1;
      } else {
        feedback.push('One lowercase letter');
      }

      if (/[A-Z]/.test(password)) {
        score += 1;
      } else {
        feedback.push('One uppercase letter');
      }

      if (/\d/.test(password)) {
        score += 1;
      } else {
        feedback.push('One number');
      }

      if (/[^a-zA-Z\d]/.test(password)) {
        score += 1;
      } else {
        feedback.push('One special character');
      }

      let level = 'poor';
      if (score >= 4) {
        level = 'strong';
      } else if (score >= 2) {
        level = 'medium';
      }

      setPasswordStrength({
        score,
        level,
        feedback,
      });
    };

    if (formData.password) {
      checkPasswordStrength(formData.password);
    } else {
      setPasswordStrength({ score: 0, level: 'none', feedback: [] });
    }
  }, [formData.password]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      return;
    }

    // Password strength is already checked in canSubmit

    setIsSubmitting(true);

    const result = await register(
      formData.username,
      formData.email,
      formData.password
    );

    if (result.success) {
      navigate('/', { replace: true });
    } else {
      setValidationErrors(result.details || []);
    }

    setIsSubmitting(false);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleGoogleLogin = () => {
    // TODO: Implement Google OAuth
    showPopup('Google OAuth integration coming soon!', 'info');
  };

  const passwordsMatch =
    formData.password &&
    formData.confirmPassword &&
    formData.password === formData.confirmPassword;

  const canSubmit =
    formData.username &&
    formData.email &&
    formData.password &&
    formData.confirmPassword &&
    passwordsMatch &&
    formData.password.length >= 8;

  return (
    <div className="login-page-new">
      <div className="login-container-new">
        <div className="login-form-container">
                    <div className="login-header">
                      <h2>Create Account</h2>
                      <p>Join MS Enterprises for the best shopping experience</p>
                    </div>
          
                    <form onSubmit={handleSubmit} className="login-form">          <div className="form-group">
            <div className="input-group">
              <FiUser className="input-icon" />
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder=" "
                required
                disabled={isSubmitting}
              />
              <label htmlFor="username">Username</label>
            </div>
          </div>

          <div className="form-group">
            <div className="input-group">
              <FiMail className="input-icon" />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder=" "
                required
                disabled={isSubmitting}
              />
              <label htmlFor="email">Email Address</label>
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
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>

            {formData.password && (
              <div className="password-strength">
                <div className="strength-meter">
                  <div
                    className={`strength-fill strength-${passwordStrength.level}`}
                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                  ></div>
                </div>
                <div className="strength-label">
                  Password strength:{' '}
                  <span className={`strength-${passwordStrength.level}`}>
                    {passwordStrength.level}
                  </span>
                </div>
                {passwordStrength.feedback.length > 0 && (
                  <div className="strength-feedback">
                    <p>Password should contain:</p>
                    <ul>
                      {passwordStrength.feedback.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="form-group">
            <div className="input-group">
              <FiLock className="input-icon" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder=" "
                required
                disabled={isSubmitting}
              />
              <label htmlFor="confirmPassword">Confirm Password</label>
              <button
                type="button"
                className="password-toggle"
                onClick={toggleConfirmPasswordVisibility}
                disabled={isSubmitting}
              >
                {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>

            {formData.confirmPassword && (
              <div
                className={`password-match ${passwordsMatch ? 'match' : 'no-match'}`}
              >
                {passwordsMatch
                  ? '✓ Passwords match'
                  : '✗ Passwords do not match'}
              </div>
            )}
          </div>

          {validationErrors.length > 0 && (
            <div className="error-message">
              <ul>
                {validationErrors.map((err, index) => (
                  <li key={index}>{err.msg}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            style={{ background: 'linear-gradient(135deg, #e50000 0%, #cc0000 100%)' }}
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

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
          Sign up with Google
        </button>

        <p className="signup-prompt">
          Already have an account?{" "}
          <Link to="/login" className="register-link">
            Sign in here
          </Link>
        </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
