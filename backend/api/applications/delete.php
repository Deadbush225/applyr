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
    $statement = $db->prepare(
        'DELETE FROM JobApplication WHERE JobApplicationId = :jobApplicationId'
    );
    $statement->execute([
        'jobApplicationId' => $jobApplicationId,
    ]);

    jsonResponse(200, [
        'success' => true,
        'data' => [
            'deleted' => $statement->rowCount() > 0,
        ],
    ]);
} catch (Throwable $error) {
    jsonResponse(500, [
        'success' => false,
        'message' => 'Application could not be deleted.',
    ]);
}
