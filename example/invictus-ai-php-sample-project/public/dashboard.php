<?php
session_start();
if (!isset($_SESSION['user'])) {
    header('Location: login.php');
    exit;
}
$email = $_SESSION['user'];
if (isset($_POST['logout'])) {
    session_destroy();
    header('Location: login.php');
    exit;
}
?><!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard</title>
    <link href="https://fonts.googleapis.com/css?family=Roboto:400,700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Roboto', sans-serif; background: #f4f6f8; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .container { background: #fff; padding: 2rem 3rem; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); text-align: center; }
        h2 { color: #1976d2; margin-bottom: 1rem; }
        form { margin-top: 2rem; }
        button { padding: 0.7rem 2rem; background: #d32f2f; color: #fff; border: none; border-radius: 5px; font-weight: 700; font-size: 1rem; cursor: pointer; transition: background 0.2s; }
        button:hover { background: #b71c1c; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Welcome, <?= htmlspecialchars($email) ?>!</h2>
        <p>You are logged in.</p>
        <form method="post">
            <button type="submit" name="logout">Logout</button>
        </form>
    </div>
</body>
</html> 