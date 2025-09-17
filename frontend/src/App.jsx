import React, { useState } from 'react';
import './App.css';

function App() {
  const [password, setPassword] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkPassword = async () => {
    if (!password) {
      alert('Please enter a password');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/check_password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to check password. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = () => {
    if (!result) return '#666';
    
    switch (result.rating) {
      case 'Weak': return '#ff4d4d';
      case 'Medium': return '#ffa64d';
      case 'Strong': return '#33cc33';
      default: return '#666';
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>PassGuardian</h1>
        <p>Check your password strength</p>
        
        <div className="password-form">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="password-input"
          />
          <button 
            onClick={checkPassword} 
            disabled={loading}
            className="check-button"
          >
            {loading ? 'Checking...' : 'Check Strength'}
          </button>
        </div>

        {result && (
          <div className="result-container">
            <h2>Password Strength: 
              <span style={{ color: getRatingColor() }}>
                {result.rating}
              </span>
            </h2>
            
            <div className="feedback-list">
              {result.feedback.map((item, index) => (
                <p key={index} className="feedback-item">
                  {item}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="info-box">
          <h3>How PassGuardian works:</h3>
          <ul>
            <li>Checks if password is at least 12 characters long</li>
            <li>Looks for uppercase and lowercase letters</li>
            <li>Verifies inclusion of numbers and special characters</li>
            <li>Compares against common passwords</li>
          </ul>
        </div>
      </header>
    </div>
  );
}

export default App;