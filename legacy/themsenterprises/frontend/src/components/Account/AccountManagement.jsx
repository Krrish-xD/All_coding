// src/components/Account/AccountManagement.jsx
import React, { useState } from 'react';
import { FiLogOut, FiTrash2 } from 'react-icons/fi';
import ConfirmModal from './ConfirmModal';
import './AccountManagement.css';

const AccountManagement = ({ handleLogout, handleDeleteAccount }) => {
  const [showLogout, setShowLogout] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [loadingLogout, setLoadingLogout] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const onConfirmLogout = async () => {
    try {
      setLoadingLogout(true);
      await Promise.resolve(handleLogout?.());
    } finally {
      setLoadingLogout(false);
      setShowLogout(false);
    }
  };

  const onConfirmDelete = async () => {
    try {
      setLoadingDelete(true);
      await Promise.resolve(handleDeleteAccount?.());
    } finally {
      setLoadingDelete(false);
      setShowDelete(false);
    }
  };

  return (
    <div className="account-section account-management">
      <h2 className="am-title">Account Management</h2>

      <div className="am-grid">
        {/* Logout */}
        <div className="am-card">
          <div className="am-card-inner">
            <div className="am-icon-wrap">
              <FiLogOut className="am-icon" />
            </div>
            <h3 className="am-card-title">Logout</h3>
            <p className="am-card-desc">Sign out of your account</p>
            <button
              type="button"
              className="am-btn am-btn-gradient"
              onClick={() => setShowLogout(true)}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Delete */}
        <div className="am-card am-danger">
          <div className="am-card-inner">
            <div className="am-icon-wrap danger">
              <FiTrash2 className="am-icon" />
            </div>
            <h3 className="am-card-title">Delete Account</h3>
            <p className="am-card-desc">
              Permanently delete your account and all data
            </p>
            <button
              type="button"
              className="am-btn am-btn-danger"
              onClick={() => setShowDelete(true)}
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Logout confirmation modal */}
      <ConfirmModal
        open={showLogout}
        title="Confirm Logout"
        message="Are you sure you want to log out?"
        confirmLabel="Logout"
        cancelLabel="Cancel"
        variant="default"
        loading={loadingLogout}
        onConfirm={onConfirmLogout}
        onCancel={() => setShowLogout(false)}
      />

      {/* Delete confirmation modal (requires typing) */}
      <ConfirmModal
        open={showDelete}
        title="Delete Account"
        message="This action is permanent and cannot be undone."
        confirmLabel="Delete Account"
        cancelLabel="Cancel"
        variant="danger"
        requireText="confirm delete"
        loading={loadingDelete}
        onConfirm={onConfirmDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
};

export default AccountManagement;