import React, { useState, useRef, useEffect } from 'react';
import './CustomDropdown.css';

const CustomDropdown = ({ options, value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleToggle = () => setIsOpen(!isOpen);

    const handleSelect = (option) => {
        onChange(option);
        setIsOpen(false);
    };

    return (
        <div className="custom-dropdown-wrapper" ref={wrapperRef}>
            <button
                type="button"
                className={`custom-dropdown-btn ${isOpen ? 'open' : ''}`}
                onClick={handleToggle}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span>{value === 'all' ? 'All Categories' : value}</span>
                <span className="material-icons">{isOpen ? 'expand_less' : 'expand_more'}</span>
            </button>

            {isOpen && (
                <div className="custom-dropdown-menu" role="listbox">
                    {options.map((opt) => (
                        <button
                            key={opt}
                            type="button"
                            className={`custom-dropdown-item ${value === opt ? 'active' : ''}`}
                            onClick={() => handleSelect(opt)}
                            role="option"
                            aria-selected={value === opt}
                        >
                            {opt === 'all' ? 'All Categories' : opt}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CustomDropdown;
