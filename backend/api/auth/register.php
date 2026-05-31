<?php

declare(strict_types=1);

require_once __DIR__ . '/../../index.php';
require_once __DIR__ . '/../../database.php';
require_once __DIR__ . '/session.php';

$input = readJsonInput();
$name = trim((string)($input['name'] ?? ''));
$email = trim((string)($input['email'] ?? ''));
$password = (string)($input['password'] ?? '');

if ($email === '' || $password === '') {
    jsonResponse(422, [
        'success' => false,
        'message' => 'Email and password are required.',
    ]);
    exit;
}

if ($name === '') {
    jsonResponse(422, [
        'success' => false,
        'message' => 'Name is required.',
    ]);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(422, [
        'success' => false,
        'message' => 'Email is not valid.',
    ]);
}

try {
    $db = getDatabaseConnection();
    $existing = $db->prepare('SELECT applicantId FROM Applicant WHERE emailAddress = :email');
    $existing->execute(['email' => $email]);

    if ($existing->fetch()) {
        jsonResponse(409, [
            'success' => false,
            'message' => 'Email is already registered.',
        ]);
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    // Let the database assign the applicantId (AUTO_INCREMENT). Capture it via lastInsertId.
    $statement = $db->prepare(
        'INSERT INTO Applicant (applicantName, homeAddress, phoneNumber, emailAddress, linkedInUrl, citizenshipStatus, hasCriminalHistory, passwordHash) '
        . 'VALUES (:name, :homeAddress, :phoneNumber, :email, :linkedInUrl, :citizenshipStatus, :hasCriminalHistory, :hash)'
    );
    $statement->execute([
        'name' => $name,
        'homeAddress' => '',
        'phoneNumber' => '',
        'email' => $email,
        'linkedInUrl' => '',
        'citizenshipStatus' => 'Other',
        'hasCriminalHistory' => 0,
        'hash' => $hash,
    ]);

    $applicantId = (string)$db->lastInsertId();
    $token = createSessionToken($applicantId);

    jsonResponse(201, [
        'success' => true,
        'data' => [
            'token' => $token,
            'user' => [
                'id' => (string)$applicantId,
                'email' => $email,
                'name' => $name,
            ],
        ],
    ]);
} catch (Throwable $error) {
    jsonResponse(500, [
        'success' => false,
        'message' => 'Registration failed.',
    ]);
}
