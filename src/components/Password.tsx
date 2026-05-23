import { useState } from 'react';

function Password({ onChange, value }: { onChange: (value: string) => void; value: string }) {
  // 1. Initialize local state to track visibility
  const [isVisible, setIsVisible] = useState(false);

  // 2. Toggle function flips the current state
  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  return (
    <div className="password-field">
      {/* 3. Bind the input type dynamically based on state */}
      <input 
        type={isVisible ? "text" : "password"} 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
      />
      {/* 4. Bind the onClick event to our toggle function */}
      <button type="button" className="eye-button" onClick={toggleVisibility}>
        <span role="img" aria-label="Toggle Password Visibility" className={isVisible ? "enabled" : "disabled"}>
          👁️
        </span>
      </button>
    </div>
  );
}

export default Password;