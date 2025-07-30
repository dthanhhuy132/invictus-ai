<?php
require_once '../src/functions.php';
$errors = [];
$success = false;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $errors = validate_registration($username, $email, $password);
    if (!$errors) {
        if (register_user($username, $email, $password)) {
            $success = true;
        } else {
            $errors[] = 'User already exists or error saving.';
        }
    }
}
?><!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Register</title>
    <link href="https://fonts.googleapis.com/css?family=Roboto:400,700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Roboto', sans-serif; background: #f4f6f8; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .container { background: #fff; padding: 2rem 3rem; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); width: 350px; }
        h2 { margin-bottom: 1.5rem; color: #1976d2; }
        form { display: flex; flex-direction: column; }
        input { margin-bottom: 1rem; padding: 0.7rem; border: 1px solid #ccc; border-radius: 5px; font-size: 1rem; }
        button { padding: 0.7rem; background: #1976d2; color: #fff; border: none; border-radius: 5px; font-weight: 700; font-size: 1rem; cursor: pointer; transition: background 0.2s; }
        button:hover { background: #1565c0; }
        .error { color: #d32f2f; margin-bottom: 1rem; }
        .success { color: #388e3c; margin-bottom: 1rem; }
        a { color: #1976d2; text-decoration: none; font-size: 0.95rem; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Register</h2>
        <?php if ($success): ?>
            <div class="success">Registration successful! <a href="login.php">Login here</a>.</div>
        <?php endif; ?>
        <?php if ($errors): ?>
            <div class="error">
                <?php foreach ($errors as $e) echo htmlspecialchars($e) . '<br>'; ?>
            </div>
        <?php endif; ?>
        <form method="post" autocomplete="off">
            <input type="text" name="username" placeholder="Username" value="<?= htmlspecialchars($_POST['username'] ?? '') ?>" required>
            <input type="email" name="email" placeholder="Email" value="<?= htmlspecialchars($_POST['email'] ?? '') ?>" required>
            <input type="password" name="password" placeholder="Password" required>
            <button type="submit">Register</button>
        </form>
        <div style="margin-top:1rem;">
            Already have an account? <a href="login.php">Login</a>
        </div>
    </div>
</body>
</html> 