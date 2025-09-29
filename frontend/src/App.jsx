import React, { useState } from 'react';
import './App.css';

function App() {
  const [password, setPassword] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('check'); // 'check' or 'generate'
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  
  // Password generator settings
  const [genSettings, setGenSettings] = useState({
    length: 16,
    useUppercase: true,
    useNumbers: true,
    useSymbols: true
  });

  // Check password strength
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

  // Generate password
  const generatePassword = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/generate_password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(genSettings),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      setGeneratedPassword(data.password);
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to generate password. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Update generator settings
  const updateGenSetting = (key, value) => {
    setGenSettings(prev => ({
      ...prev,
      [key]: value
    }));
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
        <p>Secure password strength checker and generator</p>
        
        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'check' ? 'active' : ''}`}
            onClick={() => setActiveTab('check')}
          >
            Check Strength
          </button>
          <button 
            className={`tab-button ${activeTab === 'generate' ? 'active' : ''}`}
            onClick={() => setActiveTab('generate')}
          >
            Generate Password
          </button>
        </div>

        {/* Check Password Tab */}
        {activeTab === 'check' && (
          <div className="tab-content">
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
          </div>
        )}

        {/* Generate Password Tab */}
        {activeTab === 'generate' && (
          <div className="tab-content">
            <div className="generator-settings">
              <div className="setting-group">
                <label className="setting-label">
                  Password Length: {genSettings.length}
                </label>
                <input
                  type="range"
                  min="8"
                  max="32"
                  value={genSettings.length}
                  onChange={(e) => updateGenSetting('length', parseInt(e.target.value))}
                  className="length-slider"
                />
                <div className="length-labels">
                  <span>8</span>
                  <span>32</span>
                </div>
              </div>

              <div className="setting-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={genSettings.useUppercase}
                    onChange={(e) => updateGenSetting('useUppercase', e.target.checked)}
                  />
                  Include Uppercase Letters (A-Z)
                </label>
              </div>

              <div className="setting-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={genSettings.useNumbers}
                    onChange={(e) => updateGenSetting('useNumbers', e.target.checked)}
                  />
                  Include Numbers (0-9)
                </label>
              </div>

              <div className="setting-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={genSettings.useSymbols}
                    onChange={(e) => updateGenSetting('useSymbols', e.target.checked)}
                  />
                  Include Symbols (!@#$% etc.)
                </label>
              </div>

              <button 
                onClick={generatePassword} 
                disabled={loading}
                className="generate-button"
              >
                {loading ? 'Generating...' : 'Generate Secure Password'}
              </button>
            </div>

            {/* Generated Password Display */}
            {generatedPassword && (
              <div className="generated-password-container">
                <h3>Your Generated Password:</h3>
                <div className="password-display">
                  <code className="generated-password">{generatedPassword}</code>
                  <button 
                    onClick={() => copyToClipboard(generatedPassword)}
                    className={`copy-button ${isCopied ? 'copied' : ''}`}
                  >
                    {isCopied ? '✓ Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="password-length">
                  Length: {generatedPassword.length} characters
                </p>
              </div>
            )}
          </div>
        )}

        {/* Results Display (Shared between both tabs) */}
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
            <li>Generates cryptographically secure random passwords</li>
          </ul>
        </div>
      </header>
    </div>
  );
}

export default App;