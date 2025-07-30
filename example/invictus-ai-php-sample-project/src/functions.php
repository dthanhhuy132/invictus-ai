<?php
function get_users_file() {
    return __DIR__ . '/../data/users.json';
}

function load_users() {
    $file = get_users_file();
    if (!file_exists($file)) return [];
    $json = file_get_contents($file);
    $users = json_decode($json, true);
    return is_array($users) ? $users : [];
}

function save_users($users) {
    $file = get_users_file();
    file_put_contents($file, json_encode($users, JSON_PRETTY_PRINT));
}

function validate_registration($username, $email, $password) {
    $errors = [];
    if (!$username || strlen($username) < 3) {
        $errors[] = 'Username must be at least 3 characters.';
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Invalid email address.';
    }
    if (!$password || strlen($password) < 6) {
        $errors[] = 'Password must be at least 6 characters.';
    }
    $users = load_users();
    foreach ($users as $user) {
        if ($user['email'] === $email) {
            $errors[] = 'Email already registered.';
            break;
        }
        if ($user['username'] === $username) {
            $errors[] = 'Username already taken.';
            break;
        }
    }
    return $errors;
}

function register_user($username, $email, $password) {
    $users = load_users();
    foreach ($users as $user) {
        if ($user['email'] === $email || $user['username'] === $username) {
            return false;
        }
    }
    $users[] = [
        'username' => $username,
        'email' => $email,
        'password' => password_hash($password, PASSWORD_DEFAULT)
    ];
    save_users($users);
    return true;
}

function login_user($email, $password) {
    $users = load_users();
    foreach ($users as $user) {
        if ($user['email'] === $email && password_verify($password, $user['password'])) {
            return true;
        }
    }
    return false;
} 