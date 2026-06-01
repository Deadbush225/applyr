<?php

declare(strict_types=1);

require_once __DIR__ . '/../../index.php';
require_once __DIR__ . '/../../database.php';

$input = readJsonInput();
$applicantId = trim((string)($input['applicantId'] ?? ''));

if ($applicantId === '') {
    jsonResponse(422, [
        'success' => false,
        'message' => 'ApplicantId is required.',
    ]);
    exit;
}

try {
    $db = getDatabaseConnection();
    $statement = $db->prepare(
        'SELECT '
        . 'ja.JobApplicationId, ja.applicantId, ja.appliedPosition, ja.JobApplicationDate, ja.JobApplicationStatus, '
        . 'ja.availableStartDate, ja.expectedSalary, ja.resumeFileUrl, ja.agreesToDrugTest, ja.agreedToTerms, '
        . 'ja.dateAgreed, COALESCE(ars.lastUpdated, ja.dateAgreed) AS lastUpdated, '
        . 'ars.resumeTemplate, ars.previewFont, ars.lastUpdated AS settingsLastUpdated '
        . 'FROM JobApplication ja '
        . 'LEFT JOIN ApplicationResumeSettings ars ON ars.JobApplicationId = ja.JobApplicationId '
        . 'WHERE ja.applicantId = :applicantId '
        . 'ORDER BY COALESCE(ars.lastUpdated, ja.dateAgreed) DESC'
    );
    $statement->execute(['applicantId' => $applicantId]);
    $applications = $statement->fetchAll(PDO::FETCH_ASSOC);

    // Fetch References for all these applications
    $stmtRef = $db->prepare('SELECT r.* FROM Reference r JOIN JobApplication ja ON r.JobApplicationId = ja.JobApplicationId WHERE ja.applicantId = :applicantId');
    $stmtRef->execute(['applicantId' => $applicantId]);
    $references = $stmtRef->fetchAll(PDO::FETCH_ASSOC);

    // Attach references to each application
    foreach ($applications as &$app) {
        $app['references'] = [];
        foreach ($references as $ref) {
            if ($ref['JobApplicationId'] === $app['JobApplicationId']) {
                $app['references'][] = $ref;
            }
        }
    }
    unset($app); // break reference

    jsonResponse(200, [
        'success' => true,
        'data' => $applications,
    ]);
} catch (Throwable $error) {
    jsonResponse(500, [
        'success' => false,
        'message' => 'Failed to load applications.',
    ]);
}
