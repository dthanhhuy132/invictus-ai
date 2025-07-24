<?php
class User {
    public $id;
    public $name;

    public function __construct($id, $name) {
        $this->id = $id;
        $this->name = $name;
    }

    public function isValid() {
        return is_numeric($this->id) && !empty($this->name);
    }

    public function toArray() {
        return [
            'id' => $this->id,
            'name' => $this->name
        ];
    }
} 