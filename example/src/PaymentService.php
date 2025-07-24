<?php
require_once 'User.php';
class PaymentService {
    private $balance;
    private $logs = [];

    public function __construct($balance = 1000) {
        $this->balance = $balance;
    }

    public function process($amount) {
        if ($amount <= 0) {
            $this->log('Invalid amount');
            return [
                'success' => false,
                'message' => 'Invalid amount',
                'balance' => $this->balance
            ];
        }
        if ($amount > $this->balance) {
            $this->log('Insufficient funds');
            return [
                'success' => false,
                'message' => 'Insufficient funds',
                'balance' => $this->balance
            ];
        }
        $this->balance -= $amount;
        $this->log("Processed payment: $amount");
        // Giả lập truy vấn SQL
        $sql = "INSERT INTO payments (user_id, amount, status) VALUES (?, ?, 'completed');";
        $this->log("SQL: $sql");
        return [
            'success' => true,
            'message' => 'Payment processed',
            'balance' => $this->balance
        ];
    }

    public function processForUser($user, $amount) {
        if (!$user->isValid()) {
            $this->log('Invalid user');
            return [
                'success' => false,
                'message' => 'Invalid user',
                'balance' => $this->balance
            ];
        }
        // Gọi process
        $result = $this->process($amount);
        $result['user_id'] = $user->id;
        return $result;
    }

    private function log($msg) {
        $this->logs[] = date('Y-m-d H:i:s') . ' - ' . $msg;
    }

    public function getLogs() {
        return $this->logs;
    }
} 