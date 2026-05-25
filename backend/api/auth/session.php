<?php

declare(strict_types=1);

require_once __DIR__ . '/../../config.php';

function createSessionToken(string $applicantId): string
{
    return $applicantId;
}

function validateSessionToken(PDO $db, string $token): ?array
{
    $statement = $db->prepare(
        'SELECT applicantId, emailAddress, applicantName '
        . 'FROM Applicant '
        . 'WHERE applicantId = :applicantId LIMIT 1'
    );
    $statement->execute(['applicantId' => $token]);
    $session = $statement->fetch();

    if (!$session) {
        return null;
    }

    return [
        'applicantId' => (string)$session['applicantId'],
        'emailAddress' => (string)$session['emailAddress'],
        'applicantName' => (string)$session['applicantName'],
    ];
}
