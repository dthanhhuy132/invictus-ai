<?php
// ... existing code ...
?><!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome</title>
    <link href="https://fonts.googleapis.com/css?family=Roboto:400,700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Roboto', sans-serif; background: #f4f6f8; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .container { background: #fff; padding: 2rem 3rem; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); text-align: center; }
        h1 { margin-bottom: 1.5rem; color: #333; }
        a { display: inline-block; margin: 0.5rem 1rem; padding: 0.7rem 2rem; background: #1976d2; color: #fff; border-radius: 5px; text-decoration: none; font-weight: 700; transition: background 0.2s; }
        a:hover { background: #1565c0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to PHP Auth Demo</h1>
        <a href="register.php">Register</a>
        <a href="login.php">Login</a>
    </div>
</body>
</html> 