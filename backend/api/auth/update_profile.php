<?php

declare(strict_types=1);

require_once __DIR__ . '/../../index.php';
require_once __DIR__ . '/../../database.php';

$input = readJsonInput();
$applicantId = trim((string)($input['applicantId'] ?? ''));
$currentPassword = (string)($input['currentPassword'] ?? '');
$newPassword = (string)($input['newPassword'] ?? '');
$name = trim((string)($input['applicantName'] ?? ''));
$homeAddress = trim((string)($input['homeAddress'] ?? ''));
$phoneNumber = preg_replace('/\s+/', '', trim((string)($input['phoneNumber'] ?? '')));
$emailAddress = trim((string)($input['emailAddress'] ?? ''));
$linkedinUrl = trim((string)($input['linkedInUrl'] ?? ''));
$citizenshipStatus = trim((string)($input['citizenshipStatus'] ?? ''));
$hasCriminalHistory = (int)($input['hasCriminalHistory'] ?? 0);

if ($applicantId === '' || $emailAddress === '') {
    jsonResponse(422, [
        'success' => false,
        'message' => 'ApplicantId and email are required.',
    ]);
    exit;
}

try {
    $db = getDatabaseConnection();
    $statement = $db->prepare('SELECT applicantName, passwordHash FROM Applicant WHERE applicantId = :applicantId LIMIT 1');
    $statement->execute(['applicantId' => $applicantId]);
    $existing = $statement->fetch(PDO::FETCH_ASSOC);

    if (!$existing) {
        jsonResponse(404, [
            'success' => false,
            'message' => 'Applicant not found.',
        ]);
        exit;
    }

    if ($newPassword !== '') {
        if ($currentPassword === '') {
            jsonResponse(422, [
                'success' => false,
                'message' => 'Current password is required to change your password.',
            ]);
            exit;
        }

        if (!password_verify($currentPassword, (string)$existing['passwordHash'])) {
            jsonResponse(401, [
                'success' => false,
                'message' => 'Current password is incorrect.',
            ]);
            exit;
        }
    }

    $duplicate = $db->prepare(
        'SELECT applicantId FROM Applicant WHERE emailAddress = :emailAddress AND applicantId <> :applicantId LIMIT 1'
    );
    $duplicate->execute([
        'emailAddress' => $emailAddress,
        'applicantId' => $applicantId,
    ]);

    if ($duplicate->fetch()) {
        jsonResponse(409, [
            'success' => false,
            'message' => 'Email is already in use.',
        ]);
        exit;
    }

    if ($newPassword !== '' && strlen($newPassword) < 8) {
        jsonResponse(422, [
            'success' => false,
            'message' => 'New password must be at least 8 characters long.',
        ]);
        exit;
    }

    $effectiveName = $name !== '' ? $name : (string)($existing['applicantName'] ?? '');

    $query =
        'UPDATE Applicant SET '
        . 'applicantName = :applicantName, '
        . 'homeAddress = :homeAddress, '
        . 'phoneNumber = :phoneNumber, '
        . 'emailAddress = :emailAddress, '
        . 'linkedInUrl = :linkedInUrl, '
        . 'citizenshipStatus = :citizenshipStatus, '
        . 'hasCriminalHistory = :hasCriminalHistory';

    $params = [
        'applicantId' => $applicantId,
        'applicantName' => $effectiveName,
        'homeAddress' => $homeAddress,
        'phoneNumber' => $phoneNumber,
        'emailAddress' => $emailAddress,
        'linkedInUrl' => $linkedinUrl,
        'citizenshipStatus' => $citizenshipStatus,
        'hasCriminalHistory' => $hasCriminalHistory,
    ];

    if ($newPassword !== '') {
        $query .= ', passwordHash = :passwordHash';
        $params['passwordHash'] = password_hash($newPassword, PASSWORD_DEFAULT);
    }

    $query .= ' WHERE applicantId = :applicantId';

    $update = $db->prepare($query);
    $update->execute($params);

    jsonResponse(200, [
        'success' => true,
        'data' => [
            'applicantId' => $applicantId,
            'applicantName' => $effectiveName,
            'emailAddress' => $emailAddress,
        ],
    ]);
} catch (Throwable $error) {
    jsonResponse(500, [
        'success' => false,
        'message' => 'Failed to update applicant profile.',
    ]);
}
