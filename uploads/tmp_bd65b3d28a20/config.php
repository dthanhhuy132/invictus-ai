<?php
return [
    'db_host' => 'localhost',
    'db_name' => 'testdb',
    'db_user' => 'root',
    'db_pass' => '',
    'cache' => [
        'enabled' => true,
        'driver' => 'redis',
        'host' => '127.0.0.1',
        'port' => 6379
    ],
    'mail' => [
        'smtp_host' => 'smtp.example.com',
        'smtp_port' => 587,
        'username' => 'noreply@example.com',
        'password' => 'secret',
        'from' => 'noreply@example.com'
    ]
]; 