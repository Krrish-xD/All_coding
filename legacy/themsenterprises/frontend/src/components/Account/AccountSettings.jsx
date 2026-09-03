import React from 'react';
import './AccountSettings.css';

const AccountSettings = ({
  profileForm,
  setProfileForm,
  passwordForm,
  setPasswordForm,
  handleProfileUpdate,
  handlePasswordChange,
  handleLogout,
  handleDeleteAccount
}) => {
  return (
    <div className="account-section">
      <h2>Account Settings</h2>
      <div className="settings-container">
        <div className="settings-flex-container">
          <div className="setting-section">
            <h3>Change Password</h3>
            <form onSubmit={handlePasswordChange}>
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                  required
                  minLength="8"
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                  required
                />
              </div>
              <button type="submit" className="submit-btn">Change Password</button>
            </form>
          </div>
          <div className="setting-section">
            <h3>Update Profile</h3>
            <form onSubmit={handleProfileUpdate}>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={profileForm.username}
                  onChange={(e) => setProfileForm({...profileForm, username: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="text"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                  pattern="\d{10}"
                  title="Phone number must be 10 digits"
                />
              </div>
              <button type="submit" className="submit-btn">Update Profile</button>
            </form>
          </div>
        </div>
        <div className="danger-zone">
          <h3>Danger Zone</h3>
          <div className="danger-actions">
            <button onClick={handleLogout} className="btn-danger">Log Out</button>
            <button onClick={handleDeleteAccount} className="btn-danger-outline">Delete Account</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
