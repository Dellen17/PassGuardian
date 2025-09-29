from flask import Flask, request, jsonify, session
from flask_cors import CORS
import re
import random
import string
import secrets  # For cryptographically secure random generation
import hashlib
import time
from datetime import datetime
import os
import json

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'passguardian-secret-key-2024')
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = 3600  # 1 hour session lifetime

# Configure CORS for both development and production
allowed_origins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://pass-guardian-flame.vercel.app'
]

additional_origins = os.environ.get('ALLOWED_ORIGINS', '').split(',')
allowed_origins.extend([origin.strip() for origin in additional_origins if origin.strip()])

CORS(app, 
     supports_credentials=True, 
     origins=allowed_origins,
     methods=['GET', 'POST', 'OPTIONS'],
     allow_headers=['Content-Type'])

# A function to load common passwords from the .txt file
def load_common_passwords(filename):
    """Load common passwords from a text file"""
    try:
        with open(filename, 'r') as file:
            common_passwords = set(line.strip() for line in file)
        return common_passwords
    except FileNotFoundError:
        print(f"Warning: {filename} not found. Using empty common passwords list.")
        return set()

# Function to check the password strength
def check_password_strength(password, common_passwords):
    """Check the strength of a password and return a rating with feedback"""
    
    # Initialize strength score and feedback list
    score = 0
    feedback = []
    
    # Check password length (minimum 12 characters)
    if len(password) >= 12:
        score += 2
        feedback.append("✓ Good length (12+ characters)")
    else:
        feedback.append("✗ Password should be at least 12 characters long")
    
    # Check for uppercase letters
    if re.search(r'[A-Z]', password):
        score += 1
        feedback.append("✓ Contains uppercase letters")
    else:
        feedback.append("✗ Should include uppercase letters (A-Z)")
    
    # Check for lowercase letters
    if re.search(r'[a-z]', password):
        score += 1
        feedback.append("✓ Contains lowercase letters")
    else:
        feedback.append("✗ Should include lowercase letters (a-z)")
    
    # Check for numbers
    if re.search(r'[0-9]', password):
        score += 1
        feedback.append("✓ Contains numbers")
    else:
        feedback.append("✗ Should include numbers (0-9)")
    
    # Check for special characters
    if re.search(r'[^A-Za-z0-9]', password):
        score += 1
        feedback.append("✓ Contains special characters")
    else:
        feedback.append("✗ Should include special characters (!, @, #, etc.)")
    
    # Check if password is common
    if password.lower() in common_passwords:
        score = 0  # If it's a common password, it's automatically weak
        feedback.append("✗ This is a commonly used password (easily guessable)")
    else:
        feedback.append("✓ Not a commonly used password")
    
    # Determine the strength rating based on score
    if score <= 2:
        rating = "Weak"
    elif score <= 4:
        rating = "Medium"
    else:
        rating = "Strong"
    
    return rating, feedback

# Function to generate a secure password
def generate_secure_password(length=16, use_uppercase=True, use_numbers=True, use_symbols=True):
    """
    Generate a cryptographically secure random password
    
    Args:
        length: Length of the password (default: 16)
        use_uppercase: Include uppercase letters (default: True)
        use_numbers: Include numbers (default: True)
        use_symbols: Include symbols (default: True)
    
    Returns:
        Generated password string
    """
    # Define character sets
    lowercase_letters = string.ascii_lowercase
    uppercase_letters = string.ascii_uppercase if use_uppercase else ''
    numbers = string.digits if use_numbers else ''
    symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?" if use_symbols else ''
    
    # Combine all allowed characters
    all_characters = lowercase_letters + uppercase_letters + numbers + symbols
    
    # Ensure we have at least one character type selected
    if not all_characters:
        all_characters = lowercase_letters  # Fallback to at least lowercase
    
    # Generate password using cryptographically secure random choices
    password = ''.join(secrets.choice(all_characters) for _ in range(length))
    
    return password

# Function to create a secure hash of password metadata (never store actual passwords)
def create_password_hash(password):
    """Create a secure hash for password identification without storing the password"""
    if len(password) <= 4:
        identifier = f"len_{len(password)}"
    else:
        identifier = f"len_{len(password)}_start_{password[:2]}_end_{password[-2:]}"
    
    return hashlib.sha256(identifier.encode()).hexdigest()[:16]

# Initialize session history with better persistence
@app.before_request
def initialize_session():
    if 'history' not in session:
        session['history'] = []
        session.permanent = True  # Make session permanent
        print("Initialized new permanent session history")

# Enhanced history management
def add_to_history(history_entry):
    """Add entry to history with proper session management"""
    if 'history' not in session:
        session['history'] = []
    
    # Add to beginning of history
    session['history'].insert(0, history_entry)
    
    # Limit to last 20 entries
    session['history'] = session['history'][:20]
    
    # Mark session as modified to ensure it's saved
    session.modified = True
    
    print(f"Added to history. Total entries: {len(session['history'])}")

# API route to check password strength
@app.route('/check_password', methods=['POST', 'OPTIONS'])
def check_password():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    # Get the password from the request
    data = request.get_json()
    password = data.get('password', '')
    
    # Load common passwords
    common_passwords = load_common_passwords('common_passwords.txt')
    
    # Check password strength
    rating, feedback = check_password_strength(password, common_passwords)
    
    # Create history entry (without storing the actual password)
    history_entry = {
        'id': create_password_hash(password),
        'timestamp': datetime.now().isoformat(),
        'rating': rating,
        'length': len(password),
        'has_uppercase': bool(re.search(r'[A-Z]', password)),
        'has_lowercase': bool(re.search(r'[a-z]', password)),
        'has_numbers': bool(re.search(r'[0-9]', password)),
        'has_symbols': bool(re.search(r'[^A-Za-z0-9]', password)),
        'is_common': password.lower() in common_passwords,
        'type': 'checked'
    }
    
    # Add to history
    add_to_history(history_entry)
    
    # Return the result as JSON
    return jsonify({
        'rating': rating,
        'feedback': feedback,
        'history_id': history_entry['id']
    })

# New API route to generate a secure password
@app.route('/generate_password', methods=['POST', 'OPTIONS'])
def generate_password():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    """Generate a secure password with customizable options"""
    try:
        # Get generation parameters from the request
        data = request.get_json() or {}
        
        length = data.get('length', 16)
        use_uppercase = data.get('use_uppercase', True)
        use_numbers = data.get('use_numbers', True)
        use_symbols = data.get('use_symbols', True)
        
        # Validate parameters
        if not isinstance(length, int) or length < 8 or length > 64:
            return jsonify({'error': 'Password length must be between 8 and 64'}), 400
        
        # Generate the password
        generated_password = generate_secure_password(
            length=length,
            use_uppercase=use_uppercase,
            use_numbers=use_numbers,
            use_symbols=use_symbols
        )
        
        # Load common passwords for strength checking
        common_passwords = load_common_passwords('common_passwords.txt')
        
        # Check the strength of the generated password
        rating, feedback = check_password_strength(generated_password, common_passwords)
        
        # Create history entry for generated password
        history_entry = {
            'id': create_password_hash(generated_password),
            'timestamp': datetime.now().isoformat(),
            'rating': rating,
            'length': len(generated_password),
            'has_uppercase': use_uppercase,
            'has_lowercase': True,  # Always true since we have lowercase base
            'has_numbers': use_numbers,
            'has_symbols': use_symbols,
            'is_common': generated_password.lower() in common_passwords,
            'type': 'generated'
        }
        
        # Add to history
        add_to_history(history_entry)
        
        # Return the generated password and its strength analysis
        return jsonify({
            'password': generated_password,
            'rating': rating,
            'feedback': feedback,
            'length': len(generated_password),
            'settings': {
                'length': length,
                'use_uppercase': use_uppercase,
                'use_numbers': use_numbers,
                'use_symbols': use_symbols
            },
            'history_id': history_entry['id']
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to generate password: {str(e)}'}), 500

# New endpoint to get password check history
@app.route('/get_history', methods=['GET', 'OPTIONS'])
def get_history():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    """Get the user's password check history"""
    try:
        history = session.get('history', [])
        print(f"Retrieving history. Session ID: {session.get('_id', 'unknown')}, Total entries: {len(history)}")
        return jsonify({
            'history': history,
            'total_checks': len(history),
            'session_active': True
        })
    except Exception as e:
        return jsonify({'error': f'Failed to retrieve history: {str(e)}'}), 500

# New endpoint to clear history
@app.route('/clear_history', methods=['POST', 'OPTIONS'])
def clear_history():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    """Clear the user's password check history"""
    try:
        session['history'] = []
        session.modified = True
        print("History cleared")
        return jsonify({'message': 'History cleared successfully'})
    except Exception as e:
        return jsonify({'error': f'Failed to clear history: {str(e)}'}), 500

# Debug endpoint to check session status
@app.route('/session_info', methods=['GET'])
def session_info():
    """Debug endpoint to check session status"""
    return jsonify({
        'session_id': str(session),
        'history_count': len(session.get('history', [])),
        'session_permanent': session.permanent,
        'session_modified': session.modified
    })

# Health check route to test if the API is working
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'OK', 'message': 'PassGuardian API is running'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)