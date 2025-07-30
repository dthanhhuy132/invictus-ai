# PHP Authentication Project

A simple PHP project for user registration and login with local file storage and modern UI.

## Features

- **User Registration**: Create new accounts with username, email, and password validation
- **User Login**: Secure authentication with email and password
- **Local Storage**: User data stored in JSON file (`data/users.json`)
- **Modern UI**: Clean, responsive design with CSS styling
- **Session Management**: Secure login/logout functionality
- **Password Security**: Passwords are securely hashed using PHP's built-in functions

## Requirements

- **PHP 7.2 or higher**
- **Web server** (Apache, Nginx, or PHP built-in server)

## Quick Start

### Option 1: Using PHP Built-in Server (Recommended for Development)

1. **Clone the repository**:
   ```bash
   git clone git@github.com:chechle39/invictus-ai.git
   cd invictus-ai
   git checkout php-sample-project
   ```

2. **Navigate to the project directory**:
   ```bash
   cd PHPProject
   ```

3. **Start the PHP built-in server**:
   ```bash
   php -S localhost:8000 -t public
   ```

4. **Open your browser and go to**:
   ```
   http://localhost:8000
   ```

### Option 2: Using Apache/Nginx

1. **Copy the project to your web server directory**:
   ```bash
   # For Apache (macOS)
   sudo cp -r PHPProject /Library/WebServer/Documents/
   
   # For XAMPP
   cp -r PHPProject /Applications/XAMPP/htdocs/
   ```

2. **Set proper permissions**:
   ```bash
   chmod 755 PHPProject/data
   chmod 644 PHPProject/data/users.json
   ```

3. **Access via your web server**:
   ```
   http://localhost/PHPProject/public/
   ```

## How to Test the Application

### 1. **Home Page**
- Visit `http://localhost:8000`
- You'll see a welcome page with "Register" and "Login" buttons

### 2. **Registration**
- Click **"Register"** button
- Fill in the form:
  - **Username**: At least 3 characters
  - **Email**: Valid email format
  - **Password**: At least 6 characters
- Click **"Register"** to create your account
- You'll see a success message and link to login

### 3. **Login**
- Click **"Login"** button (or the link from registration)
- Enter your **email** and **password**
- Click **"Login"** to access your dashboard
- You'll be redirected to the dashboard showing your email

### 4. **Dashboard**
- See your logged-in email address
- Click **"Logout"** to end your session
- You'll be redirected back to the login page

### 5. **Data Storage**
- All user data is stored in `data/users.json`
- View the file to see registered users (passwords are hashed)
- ```bash
  cat data/users.json
  ```

## Project Structure

```
PHPProject/
├── data/
│   └── users.json          # User data storage
├── public/
│   ├── index.php           # Landing page
│   ├── register.php        # Registration form
│   ├── login.php           # Login form
│   └── dashboard.php       # User dashboard
├── src/
│   └── functions.php       # PHP logic and functions
├── README.md               # This file
└── .gitignore             # Git ignore rules
```

## File Descriptions

- **`public/index.php`**: Welcome page with navigation links
- **`public/register.php`**: User registration form with validation
- **`public/login.php`**: User login form with authentication
- **`public/dashboard.php`**: Protected dashboard for logged-in users
- **`src/functions.php`**: Contains all PHP functions for:
  - User validation
  - Registration logic
  - Login authentication
  - File operations
- **`data/users.json`**: JSON file storing user data (auto-created)

## Security Features

- **Password Hashing**: Uses PHP's `password_hash()` and `password_verify()`
- **Input Validation**: Validates username, email, and password requirements
- **Session Management**: Secure login/logout with PHP sessions
- **SQL Injection Protection**: No database, uses file-based storage
- **XSS Protection**: Output is properly escaped with `htmlspecialchars()`

## Troubleshooting

### Common Issues:

1. **"php: command not found"**
   - Install PHP: `brew install php` (macOS) or download from php.net

2. **Permission denied on data/users.json**
   - Run: `chmod 644 data/users.json`

3. **Port 8000 already in use**
   - Use a different port: `php -S localhost:8080 -t public`

4. **Registration fails**
   - Check that `data/` directory is writable
   - Ensure PHP has write permissions

## Development Notes

- **For Demo Purposes**: This is a simple authentication system
- **Not for Production**: Use proper databases and security measures for production
- **Local Storage**: All data is stored locally in JSON format
- **No Database Required**: Everything works with file-based storage

## License

MIT License 