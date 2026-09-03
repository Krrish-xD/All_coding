import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const GoogleAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithToken } = useAuth();
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const token = searchParams.get('token');
        const errorParam = searchParams.get('error');

        // Handle error from backend
        if (errorParam) {
          let errorMessage = 'Authentication failed. Please try again.';
          
          switch (errorParam) {
            case 'google_auth_failed':
              errorMessage = 'Google authentication failed. Please try again.';
              break;
            case 'google_oauth_not_configured':
              errorMessage = 'Google login is not available at the moment. Please use email/password login.';
              break;
            case 'user_creation_failed':
              errorMessage = 'Failed to create user account. Please try again or contact support.';
              break;
            case 'invalid_token':
              errorMessage = 'Invalid authentication token. Please try again.';
              break;
            default:
              errorMessage = decodeURIComponent(errorParam);
          }
          
          setError(errorMessage);
          setIsProcessing(false);
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate(`/login?error=${encodeURIComponent(errorMessage)}`);
          }, 3000);
          
          return;
        }

        // Handle success with token
        if (token) {
          console.log('Processing Google authentication token...');
          
          const result = await loginWithToken(token);
          
          if (result.success) {
            console.log('✅ Google authentication successful');
            
            // Get redirect URL from session storage or default to home
            const redirectUrl = sessionStorage.getItem('redirectAfterLogin') || '/';
            sessionStorage.removeItem('redirectAfterLogin');
            
            // Small delay to show success message
            setTimeout(() => {
              navigate(redirectUrl);
            }, 1000);
          } else {
            throw new Error(result.message || 'Authentication failed');
          }
        } else {
          // No token and no error
          throw new Error('No authentication token received from Google');
        }
      } catch (err) {
        console.error('❌ Google authentication error:', err);
        
        const errorMessage = err.message || 'Authentication error. Please try again.';
        setError(errorMessage);
        setIsProcessing(false);
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate(`/login?error=${encodeURIComponent(errorMessage)}`);
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, loginWithToken]);

  return (
    <div className="login-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="login-container" style={{ textAlign: 'center', padding: '2rem' }}>
        {isProcessing ? (
          <>
            <div style={{ marginBottom: '2rem' }}>
              <svg 
                width="80" 
                height="80" 
                viewBox="0 0 80 80" 
                xmlns="http://www.w3.org/2000/svg"
                style={{ margin: '0 auto' }}
              >
                <circle 
                  cx="40" 
                  cy="40" 
                  r="35" 
                  stroke="#4285f4" 
                  strokeWidth="8" 
                  fill="none"
                  strokeDasharray="165 57"
                  strokeLinecap="round"
                >
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 40 40"
                    to="360 40 40"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                </circle>
              </svg>
            </div>
            <h2 style={{ marginBottom: '1rem', color: '#333' }}>Completing Google Sign In...</h2>
            <p style={{ color: '#666' }}>Please wait while we authenticate you</p>
          </>
        ) : error ? (
          <>
            <div style={{ marginBottom: '2rem' }}>
              <svg 
                width="80" 
                height="80" 
                viewBox="0 0 80 80" 
                xmlns="http://www.w3.org/2000/svg"
                style={{ margin: '0 auto' }}
              >
                <circle cx="40" cy="40" r="35" fill="#f44336" />
                <text 
                  x="40" 
                  y="55" 
                  fontSize="50" 
                  fill="white" 
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  ✕
                </text>
              </svg>
            </div>
            <h2 style={{ marginBottom: '1rem', color: '#f44336' }}>Authentication Failed</h2>
            <p style={{ color: '#666', marginBottom: '1rem' }}>{error}</p>
            <p style={{ color: '#999', fontSize: '0.9rem' }}>Redirecting to login page...</p>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default GoogleAuthCallback;