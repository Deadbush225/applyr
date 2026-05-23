<?php

declare(strict_types=1);

require_once __DIR__ . '/../../index.php';
require_once __DIR__ . '/../auth/require_auth.php';

$db = requireAuthUser();
$input = readJsonInput();
$jobApplicationId = (string)($input['jobApplicationId'] ?? '');

if ($jobApplicationId === '') {
    jsonResponse(422, [
        'success' => false,
        'message' => 'JobApplicationId is required.',
    ]);
    exit;
}

try {
    // Fetch ApplicationResumeSettings
    $statement = $db->prepare(
        'SELECT JobApplicationId, resumeTemplate, previewFont, lastUpdated '
        . 'FROM ApplicationResumeSettings '
        . 'WHERE JobApplicationId = :jobApplicationId'
    );

    $statement->execute(['jobApplicationId' => $jobApplicationId]);
    $settings = $statement->fetch(PDO::FETCH_ASSOC);

    if (!$settings) {
        // Return defaults if no settings exist yet
        jsonResponse(200, [
            'success' => true,
            'data' => [
                'JobApplicationId' => $jobApplicationId,
                'resumeTemplate' => 'classic',
                'previewFont' => 'Helvetica',
                'lastUpdated' => null,
            ],
        ]);
        exit;
    }

    jsonResponse(200, [
        'success' => true,
        'data' => $settings,
    ]);
} catch (Throwable $error) {
    jsonResponse(500, [
        'success' => false,
        'message' => 'Database Error: ' . $error->getMessage(),
        'file' => $error->getFile(),
        'line' => $error->getLine()
    ]);
}
