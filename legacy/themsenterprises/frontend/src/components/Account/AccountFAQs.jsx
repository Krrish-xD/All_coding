import React from 'react';
import './AccountFAQs.css';

const AccountFAQs = () => {
  return (
    <div className="account-section">
      <h2>Frequently Asked Questions</h2>
      <div className="faqs-list">
        <div className="faq-item">
          <h4>How do I track my order?</h4>
          <p>You can track your order using the "Track Your Order" section with your order ID.</p>
        </div>
        <div className="faq-item">
          <h4>How do I return a product?</h4>
          <p>Contact our support team within 7 days of delivery for return requests.</p>
        </div>
        <div className="faq-item">
          <h4>How do I change my password?</h4>
          <p>Go to Settings {'>'} Change Password to update your password.</p>
        </div>
        <div className="faq-item">
          <h4>How do I add a new address?</h4>
          <p>Use the Addresses section to add, edit, or delete your delivery addresses.</p>
        </div>
        <div className="faq-item">
          <h4>What payment methods do you accept?</h4>
          <p>We accept Razorpay payments including credit cards, debit cards, UPI, and net banking.</p>
        </div>
        <div className="faq-item">
          <h4>How do I customize my products?</h4>
          <p>During checkout, you can upload images, add text, and select customization options for eligible products.</p>
        </div>
      </div>
    </div>
  );
};

export default AccountFAQs;
