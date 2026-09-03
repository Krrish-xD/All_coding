import React from 'react';
import './AddressModal.css';

const AddressModal = ({
  showForm,
  setShowForm,
  addressForm,
  setAddressForm,
  editingAddress,
  setEditingAddress,
  handleAddAddress,
  handleUpdateAddress,
  filteredCities,
  handleAddressFormChange,
  indianStates
}) => {
  if (!showForm) return null;

  return (
    <div className="modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) setShowForm(false);
    }}>
      <div className="address-modal">
        <h3>{editingAddress ? 'Edit Address' : 'Add New Address'}</h3>
        <form onSubmit={editingAddress ? handleUpdateAddress : handleAddAddress}>
          <div className="form-group">
            <label>Name *</label>
            <input
              type="text"
              name="name"
              value={addressForm.name}
              onChange={handleAddressFormChange}
              required
              placeholder="Full Name"
            />
          </div>
          <div className="form-group">
            <label>Phone Number *</label>
            <input
              type="tel"
              name="phone"
              value={addressForm.phone}
              onChange={handleAddressFormChange}
              required
              pattern="\d{10}"
              title="Phone must be exactly 10 digits"
              placeholder="10 digit phone number"
            />
          </div>
          <div className="form-group">
            <label>Street Address *</label>
            <input
              type="text"
              name="street"
              value={addressForm.street}
              onChange={handleAddressFormChange}
              required
              placeholder="House number, street, locality"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>City *</label>
              <input
                type="text"
                name="city"
                value={addressForm.city}
                onChange={handleAddressFormChange}
                list="cities"
                placeholder="Start typing city name"
                required
              />
              <datalist id="cities">
                {filteredCities.map((city, index) => (
                  <option key={`${city}-${index}`} value={city} />
                ))}
              </datalist>
            </div>
            <div className="form-group">
              <label>State *</label>
              <select
                name="state"
                value={addressForm.state}
                onChange={handleAddressFormChange}
                required
              >
                <option value="">Select State</option>
                {indianStates.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Pin Code *</label>
              <input
                type="text"
                name="pinCode"
                value={addressForm.pinCode}
                onChange={handleAddressFormChange}
                required
                pattern="\d{6}"
                title="Pin code must be 6 digits"
                placeholder="123456"
              />
            </div>
            <div className="form-group">
              <label>Country</label>
              <p>India</p>
            </div>
          </div>
          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                name="isDefault"
                checked={addressForm.isDefault}
                onChange={handleAddressFormChange}
              />
              Set as default address
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="submit-btn">
              {editingAddress ? 'Update Address' : 'Add Address'}
            </button>
            <button type="button" onClick={() => {
              setShowForm(false);
              setEditingAddress(null);
              setAddressForm({ name: '', phone: '', street: '', city: '', state: '', pinCode: '', country: 'India', isDefault: false });
            }} className="cancel-btn">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddressModal;
