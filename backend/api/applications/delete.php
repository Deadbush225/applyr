<?php

declare(strict_types=1);

require_once __DIR__ . '/../../index.php';
require_once __DIR__ . '/../../database.php';

$db = getDatabaseConnection();
$input = readJsonInput();
$jobApplicationId = trim((string)($input['jobApplicationId'] ?? ''));

if ($jobApplicationId === '') {
    jsonResponse(422, [
        'success' => false,
        'message' => 'JobApplicationId is required.',
    ]);
}

try {
    $db->beginTransaction();

    // Remove dependent references first to avoid FK constraint failures
    $stmtDelRefs = $db->prepare('DELETE FROM `Reference` WHERE JobApplicationId = :jobApplicationId');
    $stmtDelRefs->execute(['jobApplicationId' => $jobApplicationId]);

    // Remove resume settings (table has ON DELETE CASCADE in schema, but ensure cleanup)
    $stmtDelSettings = $db->prepare('DELETE FROM ApplicationResumeSettings WHERE JobApplicationId = :jobApplicationId');
    $stmtDelSettings->execute(['jobApplicationId' => $jobApplicationId]);

    $statement = $db->prepare('DELETE FROM JobApplication WHERE JobApplicationId = :jobApplicationId');
    $statement->execute(['jobApplicationId' => $jobApplicationId]);

    $deleted = $statement->rowCount() > 0;

    $db->commit();

    jsonResponse(200, [
        'success' => true,
        'data' => [
            'deleted' => $deleted,
        ],
    ]);
} catch (Throwable $error) {
    jsonResponse(500, [
        'success' => false,
        'message' => 'Application could not be deleted.',
    ]);
}
