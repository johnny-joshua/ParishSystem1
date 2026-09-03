<?php

function sanitizeString(?string $value): string
{
    return htmlspecialchars(trim($value ?? ''), ENT_QUOTES, 'UTF-8');
}

function validateEmail(string $email): bool
{
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

function normalizeRegistrationName(?string $fullname): string
{
    $normalized = preg_replace('/\s+/', ' ', trim((string) $fullname));
    return strtolower($normalized ?? '');
}

function normalizeRegistrationPhone(?string $phone): string
{
    $digits = preg_replace('/[^0-9]/', '', (string) $phone) ?? '';
    if (str_starts_with($digits, '639') && strlen($digits) === 12) {
        return '0' . substr($digits, 2);
    }
    return $digits;
}

function validateGmailAddress(string $email): bool
{
    return validateEmail($email) && (bool) preg_match('/^[^@\s]+@gmail\.com$/i', trim($email));
}

function validatePhilippinePhone(?string $phone): bool
{
    if ($phone === null || trim($phone) === '') {
        return false;
    }

    // Remove all non-numeric characters
    $clean = preg_replace('/[^0-9]/', '', $phone);

    // Check if it's a valid Philippine mobile number
    // Philippine mobile numbers are 11 digits starting with 09
    // Or can be provided with country code +63 (12 digits starting with 639)
    if (preg_match('/^639([0-9]{9})$/', $clean)) {
        return true;
    }

    if (preg_match('/^09([0-9]{9})$/', $clean)) {
        return true;
    }

    return false;
}

function validateRequired(array $fields, array $data): array
{
    $errors = [];
    foreach ($fields as $field) {
        if (!isset($data[$field]) || trim((string) $data[$field]) === '') {
            $errors[$field] = ucfirst(str_replace('_', ' ', $field)) . ' is required.';
        }
    }
    return $errors;
}

function getJsonInput(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function allowedServiceTypes(): array
{
    return ['Marriage', 'Funeral', 'Baptism', 'Mass Intention', 'Private Mass'];
}

function allowedStatuses(): array
{
    return ['Pending', 'Under Review', 'Approved', 'Rejected', 'Completed', 'Cancelled'];
}

function validateRegistration(array $data): array
{
    $errors = validateRequired(['fullname', 'email', 'phone', 'password'], $data);

    if (!empty($data['email']) && !validateGmailAddress((string) $data['email'])) {
        $errors['email'] = 'Please use a valid Gmail address ending in @gmail.com.';
    }

    if (!empty($data['phone']) && !validatePhilippinePhone($data['phone'])) {
        $errors['phone'] = 'Please enter a valid Philippine mobile number (e.g., 09XXXXXXXXX or +639XXXXXXXXX).';
    }

    if (!empty($data['password']) && strlen($data['password']) < 8) {
        $errors['password'] = 'Password must be at least 8 characters.';
    }

    if (isset($data['confirm_password']) && ($data['password'] ?? '') !== $data['confirm_password']) {
        $errors['confirm_password'] = 'Passwords do not match.';
    }

    return $errors;
}

function validateProfileUpdate(array $data, array $existing): array
{
    $fullname = trim((string) ($data['fullname'] ?? $existing['fullname'] ?? ''));
    $email = strtolower(trim((string) ($data['email'] ?? $existing['email'] ?? '')));
    $phone = trim((string) ($data['phone'] ?? $existing['phone'] ?? ''));

    $errors = [];
    if ($fullname === '') {
        $errors['fullname'] = 'Full name is required.';
    }
    if ($phone === '') {
        $errors['phone'] = 'Phone number is required.';
    } elseif (!validatePhilippinePhone($phone)) {
        $errors['phone'] = 'Please enter a valid Philippine mobile number (e.g., 09XXXXXXXXX or +639XXXXXXXXX).';
    }
    if ($email === '' || !validateEmail($email)) {
        $errors['email'] = 'Please enter a valid email address.';
    }

    return $errors;
}

function validatePasswordChange(array $data): array
{
    $newPassword = (string) ($data['new_password'] ?? $data['password'] ?? '');
    $errors = validateRequired(['current_password'], $data);

    if ($newPassword === '') {
        $errors['new_password'] = 'New password is required.';
    } elseif (strlen($newPassword) < 8) {
        $errors['new_password'] = 'Password must be at least 8 characters.';
    }

    if (isset($data['confirm_password']) && $data['confirm_password'] !== '' && $newPassword !== $data['confirm_password']) {
        $errors['confirm_password'] = 'Passwords do not match.';
    }

    return $errors;
}

function allowedUserRoles(): array
{
    return ['user', 'admin'];
}

function validateAdminUserCreate(array $data): array
{
    $errors = validateRequired(['fullname', 'email', 'phone', 'password'], $data);

    if (!empty($data['email']) && !validateEmail($data['email'])) {
        $errors['email'] = 'Please enter a valid email address.';
    }

    if (!empty($data['phone']) && !validatePhilippinePhone($data['phone'])) {
        $errors['phone'] = 'Please enter a valid Philippine mobile number (e.g., 09XXXXXXXXX or +639XXXXXXXXX).';
    }

    if (!empty($data['password']) && strlen($data['password']) < 8) {
        $errors['password'] = 'Password must be at least 8 characters.';
    }

    $role = strtolower(trim((string) ($data['role'] ?? 'user')));
    if (!in_array($role, allowedUserRoles(), true)) {
        $errors['role'] = 'Role must be user or admin.';
    }

    return $errors;
}

function validateAdminUserUpdate(array $data): array
{
    $errors = [];
    $id = (int) ($data['id'] ?? 0);
    if ($id <= 0) {
        $errors['id'] = 'User id is required.';
    }

    if (isset($data['fullname']) && trim((string) $data['fullname']) === '') {
        $errors['fullname'] = 'Full name is required.';
    }

    if (isset($data['email'])) {
        $email = strtolower(trim((string) $data['email']));
        if ($email === '' || !validateEmail($email)) {
            $errors['email'] = 'Please enter a valid email address.';
        }
    }

    if (isset($data['phone'])) {
        $phone = trim((string) $data['phone']);
        if ($phone === '') {
            $errors['phone'] = 'Phone number is required.';
        } elseif (!validatePhilippinePhone($phone)) {
            $errors['phone'] = 'Please enter a valid Philippine mobile number (e.g., 09XXXXXXXXX or +639XXXXXXXXX).';
        }
    }

    if (isset($data['role'])) {
        $role = strtolower(trim((string) $data['role']));
        if (!in_array($role, allowedUserRoles(), true)) {
            $errors['role'] = 'Role must be user or admin.';
        }
    }

    if (isset($data['password']) && $data['password'] !== '') {
        if (strlen((string) $data['password']) < 8) {
            $errors['password'] = 'Password must be at least 8 characters.';
        }
    }

    return $errors;
}
