
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useEffect, useContext } from 'react';
import './App.css';

// Import context providers
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { AdminProvider } from './context/AdminContext';
import { SettingsProvider } from './context/SettingsContext';
import { PopupProvider, PopupContext } from './context/PopupContext';
import Popup from './components/common/Popup';
import eventService from './services/eventService';
import { GoogleOAuthProvider } from '@react-oauth/google';

// Import components
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';

import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import PaymentPage from './pages/PaymentPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import MyAccountPage from './pages/MyAccountPage';

import GoogleCallbackPage from './pages/GoogleCallbackPage';

// Import admin components
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminOrders from './pages/AdminOrders';
import AdminProducts from './pages/AdminProducts';
import AdminCustomers from './pages/AdminCustomers';
import AdminCustomerDetails from './pages/AdminCustomerDetails';
import AdminReports from './pages/AdminReports';
import AdminSettings from './pages/AdminSettings';
import AdminCoupons from './pages/AdminCoupons'; // Import AdminCoupons
import FloatingCartButton from './components/common/FloatingCartButton';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const PopupListener = () => {
  const { showPopup } = useContext(PopupContext);

  useEffect(() => {
    const handlePopup = (data) => {
      showPopup(data.message, data.type, data.duration);
    };

    eventService.on('show-popup', handlePopup);

    return () => {
      eventService.remove('show-popup', handlePopup);
    };
  }, [showPopup]);

  return null; // This component does not render anything
};

function App() {
  const location = useLocation();
  const appClassName = location.pathname === '/cart' ? 'App cart-background' : 'App';

  return (
    <AuthProvider>
      <CartProvider>
        <AdminProvider>
          <SettingsProvider>
            <PopupProvider>
              <PopupListener />
              <ScrollToTop />
              <div className={appClassName}>
                <Popup />
                {location.pathname === '/' && <FloatingCartButton />}
                <Routes>
                  {/* Admin routes - no header/footer */}
                  <Route path="/admin2009/login" element={<AdminLoginPage />} />
                  <Route path="/admin2009/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin2009/orders" element={<AdminOrders />} />
                  <Route path="/admin2009/products" element={<AdminProducts />} />
                  <Route path="/admin2009/customers" element={<AdminCustomers />} />
                  <Route path="/admin2009/customers/:id" element={<AdminCustomerDetails />} />
                  <Route path="/admin2009/reports" element={<AdminReports />} />
                  <Route path="/admin2009/settings" element={<AdminSettings />} />
                  <Route path="/admin2009/coupons" element={<AdminCoupons />} />

                  {/* Regular routes with header/footer */}
                  <Route path="/*" element={
                    <>
                      {!location.pathname.startsWith('/account') && <Header />}
                      <main>
                        <Routes>
                          <Route path="/" element={<HomePage />} />
                          <Route path="/login" element={<LoginPage />} />
                          <Route path="/register" element={<RegisterPage />} />
                          <Route path="/products" element={<ProductsPage />} />
                          <Route path="/product/:id" element={<ProductDetailPage />} />
                          <Route path="/terms" element={<TermsPage />} />
                          <Route path="/privacy" element={<PrivacyPage />} />
                          <Route path="/cart" element={<CartPage />} />
                          <Route path="/checkout" element={<CheckoutPage />} />
                          <Route path="/payment" element={<PaymentPage />} />
                          <Route path="/confirmation/:orderId" element={<OrderConfirmationPage />} />
                          <Route path="/account" element={<MyAccountPage />} />
                          <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
                          <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                      </main>
                      <Footer />
                    </>
                  } />
                </Routes>
              </div>
            </PopupProvider>
          </SettingsProvider>
        </AdminProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
