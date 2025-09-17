import re  # This will help with pattern matching (like checking for special characters)

# Function to load common passwords from .txt file
def load_common_passwords(filename):
    """Load common passwords from a text file"""
    try:
        with open(filename, 'r') as file:
            common_passwords = set(line.strip() for line in file)
        return common_passwords
    except FileNotFoundError:
        print(f"Warning: {filename} not found. Using empty common passwords list.")
        return set()

# Function to check password strength
def check_password_strength(password, common_passwords):
    """Check the strength of a password and return a rating with feedback"""
    
    # Initialize strength score and feedback list
    score = 0
    feedback = []
    
    # Check length (minimum 12 characters)
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
    
    # Determine strength rating based on score
    if score <= 2:
        rating = "Weak"
    elif score <= 4:
        rating = "Medium"
    else:
        rating = "Strong"
    
    return rating, feedback

# Main function to run the program
def main():
    print("=== PassGuardian Password Strength Checker ===")
    print("Checking your password strength...")
    print()
    
    # Load common passwords
    common_passwords = load_common_passwords('common_passwords.txt')
    
    # Get password from user
    password = input("Please enter a password to check: ")
    
    # Check password strength
    rating, feedback = check_password_strength(password, common_passwords)
    
    # Display the results
    print()
    print(f"Password Strength: {rating}")
    print()
    print("Detailed Feedback:")
    for item in feedback:
        print(f"  {item}")

# This makes sure the main function runs when you execute the script
if __name__ == "__main__":
    main()