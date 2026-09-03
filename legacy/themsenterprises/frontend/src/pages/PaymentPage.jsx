import React, { useEffect, useState, useRef } from 'react'; // ✅ Added useRef
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import httpClient from '../services/httpClient';
import Spinner from '../components/common/Spinner';
import './PaymentPage.css';

const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

const useExternalScript = (url) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!url) return;
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    const handleLoad = () => setIsLoaded(true);
    const handleError = () => setError(new Error(`Failed to load script: ${url}`));
    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);
    document.body.appendChild(script);
    return () => {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
      document.body.removeChild(script);
    };
  }, [url]);

  return { isLoaded, error };
};

const PaymentPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clearCart } = useCart();
  const query = useQuery();
  const orderId = query.get('order_id');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [order, setOrder] = useState(null);
  const [razorpayKey, setRazorpayKey] = useState(null);
  const [paymentProcessed, setPaymentProcessed] = useState(false); // ✅ NEW: Track payment processing

  const razorpayOpened = useRef(false); // ✅ NEW: Prevent double-opening

  const { isLoaded: isRazorpayLoaded, error: razorpayError } = useExternalScript('https://checkout.razorpay.com/v1/checkout.js');

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const keyResponse = await httpClient.get('/payments/config');
        if (keyResponse.data.keyId) {
          setRazorpayKey(keyResponse.data.keyId);
        } else {
          throw new Error('Razorpay Key ID not found.');
        }

        if (!orderId) {
          throw new Error('No order ID provided.');
        }

        const orderResponse = await httpClient.get(`/orders/${orderId}`);
        if (orderResponse.data.success) {
          const fetchedOrder = orderResponse.data.order;
          
          // ✅ CHECK: If order is already paid, redirect to confirmation
          if (fetchedOrder.paymentDetails?.status === 'completed' || 
              fetchedOrder.orderStatus === 'processing' ||
              fetchedOrder.orderStatus === 'Processing') {
            console.log('⚠️ Order already paid, redirecting to confirmation...');
            setPaymentProcessed(true);
            navigate(`/confirmation/${orderId}`, { replace: true });
            return;
          }
          
          // ✅ VALIDATE ORDER HAS RAZORPAY ORDER ID
          if (!fetchedOrder.paymentDetails?.razorpayOrderId) {
            throw new Error('Order does not have a valid Razorpay Order ID.');
          }
          
          console.log('✅ Order fetched:', {
            orderId: fetchedOrder._id,
            razorpayOrderId: fetchedOrder.paymentDetails.razorpayOrderId,
            amount: fetchedOrder.totalAmount,
            paymentStatus: fetchedOrder.paymentDetails.status,
            orderStatus: fetchedOrder.orderStatus
          });
          
          setOrder(fetchedOrder);
        } else {
          throw new Error('Failed to fetch order details.');
        }
      } catch (err) {
        console.error('❌ Initialization error:', err);
        setError(err.message || 'Initialization failed.');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [orderId, navigate]);

  useEffect(() => {
    if (razorpayError) {
      setError('Failed to load payment gateway script.');
    }
  }, [razorpayError]);

  useEffect(() => {
    // ✅ PREVENT: Don't open if already processed or already opened
    if (paymentProcessed || razorpayOpened.current) {
      console.log('⚠️ Skipping Razorpay open - already processed or opened');
      return;
    }

    if (order && user && razorpayKey && isRazorpayLoaded) {
      // ✅ DOUBLE CHECK: Order should be pending
      if (order.paymentDetails?.status !== 'pending') {
        console.log('⚠️ Order not in pending state, skipping Razorpay open');
        navigate(`/confirmation/${order._id}`, { replace: true });
        return;
      }

      // ✅ Mark as opened to prevent double-opening
      razorpayOpened.current = true;

      const options = {
        key: razorpayKey,
        amount: order.totalAmount * 100,
        currency: 'INR',
        name: 'MS Enterprises',
        description: `Order #${order._id}`,
        order_id: order.paymentDetails.razorpayOrderId,
        handler: async (response) => {
          try {
            console.log('🎉 Razorpay response received:', response);
            console.log('   - razorpay_order_id:', response.razorpay_order_id);
            console.log('   - razorpay_payment_id:', response.razorpay_payment_id);
            console.log('   - razorpay_signature:', response.razorpay_signature);

            // ✅ VALIDATE ALL FIELDS ARE PRESENT
            if (!response.razorpay_order_id || !response.razorpay_payment_id || !response.razorpay_signature) {
              console.error('❌ Incomplete Razorpay response:', response);
              setError('Payment verification failed: Incomplete payment data received.');
              razorpayOpened.current = false; // ✅ Reset flag on error
              return;
            }

            // ✅ Mark as processed IMMEDIATELY to prevent re-opening
            setPaymentProcessed(true);

            const verificationPayload = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId: order._id
            };

            console.log('📤 Sending verification request:', verificationPayload);

            const verificationResponse = await httpClient.post('/payments/verify', verificationPayload);

            console.log('✅ Verification response:', verificationResponse.data);

            if (verificationResponse.data.success) {
              clearCart();
              // ✅ Use replace: true to prevent back button issues
              navigate(`/confirmation/${order._id}`, { replace: true });
            } else {
              // ✅ Reset flags on failure
              setPaymentProcessed(false);
              razorpayOpened.current = false;
              setError('Payment verification failed. Please contact support.');
            }
          } catch (err) {
            console.error('❌ Verification error:', err);
            console.error('   Error response:', err.response?.data);
            // ✅ Reset flags on error
            setPaymentProcessed(false);
            razorpayOpened.current = false;
            setError('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: user.username,
          email: user.email,
          contact: order.shippingAddress.phone || '9999999999',
        },
        theme: {
          color: '#dc2626',
        },
        modal: {
          ondismiss: () => {
            console.log('⚠️ Payment modal dismissed by user');
            // ✅ Reset flag if user cancels
            razorpayOpened.current = false;
            navigate('/cart', { replace: true });
          },
          escape: true, // ✅ Allow ESC key to close
          backdropclose: false, // ✅ Prevent accidental backdrop close
        }
      };

      console.log('🚀 Opening Razorpay with options:', {
        key: razorpayKey,
        amount: options.amount,
        order_id: options.order_id,
        name: options.name
      });

      const rzp = new window.Razorpay(options);
      
      rzp.on('payment.failed', function (response) {
        console.error('❌ Payment failed event:', response);
        // ✅ Reset flag on payment failure
        razorpayOpened.current = false;
        alert(`Payment failed: ${response.error.description}`);
        setError(response.error.description);
      });

      rzp.open();
    }
  }, [order, user, razorpayKey, isRazorpayLoaded, navigate, clearCart, paymentProcessed]);

  // ✅ Show processing state while payment is being confirmed
  if (paymentProcessed) {
    return (
      <div className="payment-container">
        <h2>✅ Payment Successful!</h2>
        <p>Redirecting to confirmation page...</p>
        <Spinner />
      </div>
    );
  }
  if (error) return <div className="payment-error">Error: {error}</div>;
  if (loading) return <div className="payment-loading">Loading Payment...</div>;

  return (
    <div className="payment-container">
      <h2>Processing Your Payment</h2>
      <p>Please do not refresh or close this window.</p>
      <Spinner />
    </div>
  );
};

export default PaymentPage;