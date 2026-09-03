import React from 'react';
import './LegalPages.css';

const PrivacyPage = () => {
  return (
    <div className="legal-page-container">
      <h1>Privacy Policy</h1>
      <div className="legal-content">
        <p>This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You.</p>
        <p>We use Your Personal data to provide and improve the Service. By using the Service, You agree to the collection and use of information in accordance with this Privacy Policy.</p>
        
        <h2>What we collect</h2>
        <p>We may collect the following information:</p>
        <ul>
          <li>Email address</li>
          <li>Phone number</li>
          <li>Usage Data</li>
        </ul>
        <p>For the exhaustive list of cookies we collect see the List of cookies we collect section.</p>

        <h2>What we do with the information we gather</h2>
        <p>We require this information to understand your needs and provide you with a better service, and in particular for the following reasons:</p>
        <ul>
          <li>Internal record keeping.</li>
          <li>We may use the information to improve our products and services.</li>
          <li>We may periodically send promotional emails about new products, special offers or other information which we think you may find interesting using the email address which you have provided.</li>
          <li>We may also use your information to contact you regarding any quotations placed through our website. We may contact you by email, phone, fax or mail.</li>
        </ul>

        <h2>Security</h2>
        <p>We are committed to ensuring that your information is secure. In order to prevent unauthorized access or disclosure, we have put in place suitable physical, electronic and managerial procedures to safeguard and secure the information we collect online.</p>

        <h2>How we use cookies</h2>
        <p>A cookie is a small file which asks permission to be placed on your computer’s hard drive. Once you agree, the file is added and the cookie helps analyse web traffic or lets you know when you visit a particular site. Cookies allow web applications to respond to you as an individual. The web application can tailor its operations to your needs, likes and dislikes by gathering and remembering information about your preferences.</p>
      </div>
    </div>
  );
};

export default PrivacyPage;