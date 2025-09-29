import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [password, setPassword] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('check'); // 'check' or 'generate'
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [filterRating, setFilterRating] = useState('all');
  
  // Password generator settings
  const [genSettings, setGenSettings] = useState({
    length: 16,
    useUppercase: true,
    useNumbers: true,
    useSymbols: true
  });

  // Load history from localStorage on component mount
  useEffect(() => {
    loadLocalHistory();
  }, []);

  // Load history from localStorage
  const loadLocalHistory = () => {
    try {
      const storedHistory = localStorage.getItem('passguardian_history');
      if (storedHistory) {
        const parsedHistory = JSON.parse(storedHistory);
        setHistory(parsedHistory);
      }
    } catch (error) {
      console.error('Error loading history from localStorage:', error);
    }
  };

  // Save history to localStorage
  const saveToLocalHistory = (newEntry) => {
    try {
      const updatedHistory = [newEntry, ...history].slice(0, 20); // Keep last 20 entries
      setHistory(updatedHistory);
      localStorage.setItem('passguardian_history', JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Error saving history to localStorage:', error);
    }
  };

  // Clear local history
  const clearLocalHistory = () => {
    try {
      setHistory([]);
      localStorage.removeItem('passguardian_history');
    } catch (error) {
      console.error('Error clearing local history:', error);
    }
  };

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
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      setResult(data);
      
      // Create local history entry
      const historyEntry = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        rating: data.rating,
        length: password.length,
        has_uppercase: /[A-Z]/.test(password),
        has_lowercase: /[a-z]/.test(password),
        has_numbers: /[0-9]/.test(password),
        has_symbols: /[^A-Za-z0-9]/.test(password),
        is_common: false, // We don't have this info from frontend
        type: 'checked'
      };
      
      saveToLocalHistory(historyEntry);
      
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
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      setGeneratedPassword(data.password);
      setResult(data);
      
      // Create local history entry for generated password
      const historyEntry = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        rating: data.rating,
        length: data.length,
        has_uppercase: genSettings.useUppercase,
        has_lowercase: true, // Always true for generated passwords
        has_numbers: genSettings.useNumbers,
        has_symbols: genSettings.useSymbols,
        is_common: false,
        type: 'generated',
        generated: true
      };
      
      saveToLocalHistory(historyEntry);
      
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to generate password. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  // Load password check history (now uses local storage)
  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      // Try to load from server first (for backward compatibility)
      const response = await fetch(`${import.meta.env.VITE_API_URL}/get_history`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.history && data.history.length > 0) {
          // Merge server history with local history
          const mergedHistory = [...data.history, ...history];
          const uniqueHistory = mergedHistory.filter((item, index, self) => 
            index === self.findIndex(t => t.id === item.id)
          ).slice(0, 20);
          
          setHistory(uniqueHistory);
          localStorage.setItem('passguardian_history', JSON.stringify(uniqueHistory));
          return;
        }
      }
      
      // If server history is empty, just use local history
      loadLocalHistory();
      
    } catch (error) {
      console.error('Error loading server history:', error);
      // Fallback to local history
      loadLocalHistory();
    } finally {
      setHistoryLoading(false);
    }
  };

  // Clear history (both local and server)
  const clearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear your password check history?')) {
      return;
    }

    try {
      // Clear server history
      await fetch(`${import.meta.env.VITE_API_URL}/clear_history`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Error clearing server history:', error);
      // Continue with local clearing even if server fails
    }
    
    // Always clear local history
    clearLocalHistory();
    alert('History cleared successfully');
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

  // Filter history by rating
  const filteredHistory = history.filter(item => {
    if (filterRating === 'all') return true;
    return item.rating === filterRating;
  });

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString() + ' ' + date.toLocaleDateString();
  };

  const getRatingColor = (rating) => {
    switch (rating) {
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
        
        {/* History Toggle Button */}
        <div className="history-toggle">
          <button 
            className={`history-button ${showHistory ? 'active' : ''}`}
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? 'Hide History' : 'Show History'} 
            {history.length > 0 && ` (${history.length})`}
          </button>
        </div>

        {/* History Panel */}
        {showHistory && (
          <div className="history-panel">
            <div className="history-header">
              <h2>Password Check History</h2>
              <div className="history-controls">
                <select 
                  value={filterRating} 
                  onChange={(e) => setFilterRating(e.target.value)}
                  className="history-filter"
                >
                  <option value="all">All Ratings</option>
                  <option value="Strong">Strong</option>
                  <option value="Medium">Medium</option>
                  <option value="Weak">Weak</option>
                </select>
                <button 
                  onClick={clearHistory}
                  className="clear-history-button"
                  disabled={history.length === 0}
                >
                  Clear History
                </button>
              </div>
            </div>

            {historyLoading ? (
              <div className="history-loading">Loading history...</div>
            ) : filteredHistory.length === 0 ? (
              <div className="history-empty">
                {history.length === 0 
                  ? 'No password checks yet. Check or generate some passwords to see them here!' 
                  : 'No passwords match the selected filter.'}
              </div>
            ) : (
              <div className="history-list">
                {filteredHistory.map((item, index) => (
                  <div key={item.id || index} className="history-item">
                    <div className="history-item-header">
                      <span 
                        className="history-rating"
                        style={{ color: getRatingColor(item.rating) }}
                      >
                        {item.rating}
                      </span>
                      <span className="history-timestamp">
                        {formatTimestamp(item.timestamp)}
                      </span>
                      {item.generated && (
                        <span className="history-generated-badge">Generated</span>
                      )}
                      {item.type === 'checked' && (
                        <span className="history-checked-badge">Checked</span>
                      )}
                    </div>
                    
                    <div className="history-details">
                      <div className="history-length">Length: {item.length} chars</div>
                      <div className="history-features">
                        {item.has_uppercase && <span className="feature-tag">A-Z</span>}
                        {item.has_lowercase && <span className="feature-tag">a-z</span>}
                        {item.has_numbers && <span className="feature-tag">0-9</span>}
                        {item.has_symbols && <span className="feature-tag">!@#</span>}
                        {item.is_common && <span className="feature-tag warning">Common</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
              <span style={{ color: getRatingColor(result.rating) }}>
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
            <li>Stores check history in your browser (no passwords stored)</li>
          </ul>
        </div>
      </header>
    </div>
  );
}

export default App;