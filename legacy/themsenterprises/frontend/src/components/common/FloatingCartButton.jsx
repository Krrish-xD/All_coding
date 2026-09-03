
import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { CartContext } from '../../context/CartContext';
import { FiShoppingCart } from 'react-icons/fi';
import './FloatingCartButton.css';

const FloatingCartButton = () => {
  const { cart } = useContext(CartContext);
  const cartItemCount = cart?.length || 0;

  return (
    <Link to="/cart" className="floating-cart-button">
      <FiShoppingCart />
      {cartItemCount > 0 && <span className="badge">{cartItemCount}</span>}
    </Link>
  );
};

export default FloatingCartButton;
