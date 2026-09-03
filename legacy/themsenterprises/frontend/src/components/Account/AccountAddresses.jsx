import React from 'react';
import { FiEdit, FiTrash2, FiPlus } from 'react-icons/fi';
import './AccountAddresses.css';

const AccountAddresses = ({
  user,
  showForm,
  setShowForm,
  addressForm,
  setAddressForm,
  editingAddress,
  setEditingAddress,
  handleAddAddress,
  handleUpdateAddress,
  handleDeleteAddress,
  filteredCities,
  handleAddressFormChange,
  allCities,
  citiesByState
}) => {
  return (
    <div className="account-section">
      <h2>Manage Addresses</h2>
      <div className="addresses-container">
        <div className="existing-addresses">
          <div className="addresses-header">
            <h3>Your Addresses</h3>
            <button onClick={() => {
              setShowForm(true);
              setEditingAddress(null);
              setAddressForm({ name: '', phone: '', street: '', city: '', state: '', pinCode: '', country: 'India', isDefault: false });
              // setFilteredCities(allCities); // This will be handled in parent
            }} className="add-address-btn">
              Add New Address
            </button>
          </div>
          {user?.addresses?.length === 0 ? (
            <p>No addresses saved</p>
          ) : (
            user.addresses.map(address => (
              <div key={address._id} className={`address-card ${address.isDefault ? 'default' : ''}`}>
                {address.isDefault && <span className="default-badge">Default</span>}
                <div className="address-details">
                  <p><strong>Name:</strong> {address.name}</p>
                  <p><strong>Phone:</strong> {address.phone}</p>
                  <p><strong>Street:</strong> {address.street}</p>
                  <p><strong>City:</strong> {address.city}</p>
                  <p><strong>State:</strong> {address.state}</p>
                  <p><strong>Pin Code:</strong> {address.pinCode}</p>
                  <p><strong>Country:</strong> {address.country}</p>
                </div>
                <div className="address-actions">
                  <button onClick={() => {
                    setShowForm(true);
                    setEditingAddress(address);
                    setAddressForm({
                      name: address.name,
                      phone: address.phone,
                      street: address.street,
                      city: address.city,
                      state: address.state,
                      pinCode: address.pinCode,
                      country: address.country,
                      isDefault: address.isDefault
                    });
                    // setFilteredCities(citiesByState[address.state] || allCities); // Handle in parent
                  }} className="edit-btn">
                    <FiEdit />
                  </button>
                  <button onClick={() => handleDeleteAddress(address._id)} className="delete-btn">
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountAddresses;
