<?php
/**
 * Seed default admin password (admin123)
 * Run: php database/seed.php
 */

require_once __DIR__ . '/../config/database.php';

$email = 'admin@holyfamilyparish.com';
$password = password_hash('admin123', PASSWORD_DEFAULT);

$db = getDB();

$stmt = $db->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$exists = $stmt->fetch();

if ($exists) {
    $stmt = $db->prepare('UPDATE users SET password = ?, role = ? WHERE email = ?');
    $stmt->execute([$password, 'admin', $email]);
    echo "Admin password updated for {$email}\n";
} else {
    $stmt = $db->prepare(
        'INSERT INTO users (fullname, email, phone, address, password, role) VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        'Parish Administrator',
        $email,
        '09171234567',
        'Putiao, Pilar, Sorsogon',
        $password,
        'admin',
    ]);
    echo "Admin account created: {$email} / admin123\n";
}

echo "Done.\n";
