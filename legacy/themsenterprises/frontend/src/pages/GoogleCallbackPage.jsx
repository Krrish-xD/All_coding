import { useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Spinner from '../components/common/Spinner';

const GoogleCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useContext(AuthContext);

  useEffect(() => {
    const handleGoogleCallback = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');

      if (error) {
        console.error('Google OAuth error:', error);
        navigate('/login', {
          state: { error: 'Google authentication failed. Please try again.' }
        });
        return;
      }

      if (token) {
        try {
          // Use the token to authenticate the user
          await loginWithToken(token);
          navigate('/', { replace: true });
        } catch (error) {
          console.error('Google OAuth token error:', error);
          navigate('/login', {
            state: { error: 'Authentication failed. Please try again.' }
          });
        }
      } else {
        navigate('/login', {
          state: { error: 'No authentication token received.' }
        });
      }
    };

    handleGoogleCallback();
  }, [searchParams, navigate, loginWithToken]);

  return (
    <div className="google-callback-page">
      <div className="callback-container">
        <div className="callback-content">
          <Spinner />
          <h2>Authenticating with Google...</h2>
          <p>Please wait while we complete your authentication.</p>
        </div>
      </div>
    </div>
  );
};

export default GoogleCallbackPage;
