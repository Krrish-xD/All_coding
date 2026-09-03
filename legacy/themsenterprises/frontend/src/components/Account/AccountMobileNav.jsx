
import React from 'react';
import { FiUser, FiShoppingBag, FiMapPin, FiHelpCircle, FiSettings } from 'react-icons/fi';
import './AccountMobileNav.css';

const AccountMobileNav = ({ activeSection, setActiveSection }) => {
  const navigation = [
    { name: 'Overview', id: 'overview', icon: FiUser },
    { name: 'Addresses', id: 'addresses', icon: FiMapPin },
    { name: 'Questions', id: 'faqs', icon: FiHelpCircle },
    { name: 'Settings', id: 'settings', icon: FiSettings },
  ];

  return (
    <div className="account-mobile-nav-wrapper">
      <div className="account-mobile-nav">
        {navigation.map(item => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              className={`account-mobile-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveSection(item.id)}
            >
              <Icon className="account-mobile-nav-icon" />
              <span className="account-mobile-nav-text">{item.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AccountMobileNav;
