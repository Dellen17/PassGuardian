from flask import Flask, request, jsonify
from flask_cors import CORS
import re

app = Flask(__name__)
CORS(app)  # This allows the React frontend to communicate with the Flask backend

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

# API route to check password strength
@app.route('/check_password', methods=['POST'])
def check_password():
    # Get the password from the request
    data = request.get_json()
    password = data.get('password', '')
    
    # Load common passwords
    common_passwords = load_common_passwords('common_passwords.txt')
    
    # Check password strength
    rating, feedback = check_password_strength(password, common_passwords)
    
    # Return the result as JSON
    return jsonify({
        'rating': rating,
        'feedback': feedback
    })

# Health check route to test if the API is working
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'OK', 'message': 'PassGuardian API is running'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)