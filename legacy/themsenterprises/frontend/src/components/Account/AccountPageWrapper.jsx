
import React from 'react';
import Header from '../layout/Header';
import AccountMobileNav from './AccountMobileNav';
import './AccountPageWrapper.css';

const AccountPageWrapper = ({ children, activeSection, setActiveSection }) => {
  return (
    <div className="account-page-wrapper">
      <div className="account-header-wrapper">
        <Header />
        <AccountMobileNav activeSection={activeSection} setActiveSection={setActiveSection} />
      </div>

      <div className="account-page-body">
        <div className="account-content-area">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AccountPageWrapper;
