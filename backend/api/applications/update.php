<?php

declare(strict_types=1);

require_once __DIR__ . '/../../index.php';
require_once __DIR__ . '/../../database.php';

$db = getDatabaseConnection();
$input = readJsonInput();
$applicant = is_array($input['applicant'] ?? null) ? $input['applicant'] : [];
$jobApplication = is_array($input['jobApplication'] ?? null) ? $input['jobApplication'] : [];

$applicantId = (string)($applicant['applicantId'] ?? '');
$jobApplicationId = (string)($jobApplication['JobApplicationId'] ?? '');

if ($jobApplicationId === '') {
    jsonResponse(422, [
        'success' => false,
        'message' => 'JobApplicationId is required.',
    ]);
}

$defaults = [
    'appliedPosition' => '',
    'JobApplicationDate' => date('Y-m-d'),
    'availableStartDate' => null,
    'expectedSalary' => null,
    'resumeFileUrl' => null,
    'agreesToDrugTest' => 0,
];

$jobApplication = array_merge($defaults, $jobApplication);

try {
    $db->beginTransaction();

    $statement = $db->prepare(
        'UPDATE Applicant SET '
        . 'applicantName = :applicantName, '
        . 'homeAddress = :homeAddress, '
        . 'phoneNumber = :phoneNumber, '
        . 'emailAddress = :emailAddress, '
        . 'linkedInUrl = :linkedInUrl, '
        . 'citizenshipStatus = :citizenshipStatus, '
        . 'hasCriminalHistory = :hasCriminalHistory '
        . 'WHERE applicantId = :applicantId'
    );

    $statement->execute([
        'applicantId' => $applicantId,
        'applicantName' => (string)($applicant['applicantName'] ?? ''),
        'homeAddress' => (string)($applicant['homeAddress'] ?? ''),
        'phoneNumber' => (string)($applicant['phoneNumber'] ?? ''),
        'emailAddress' => (string)($applicant['emailAddress'] ?? ''),
        'linkedInUrl' => (string)($applicant['linkedInUrl'] ?? ''),
        'citizenshipStatus' => (string)($applicant['citizenshipStatus'] ?? ''),
        'hasCriminalHistory' => (int)($applicant['hasCriminalHistory'] ?? 0),
    ]);

    if ($statement->rowCount() === 0) {
        throw new RuntimeException('Applicant not found for token.');
    }

    $statement = $db->prepare(
        'INSERT INTO JobApplication (JobApplicationId, applicantId, appliedPosition, JobApplicationDate, JobApplicationStatus, availableStartDate, expectedSalary, resumeFileUrl, agreesToDrugTest, agreedToTerms, dateAgreed, lastUpdated) '
        . 'VALUES (:jobApplicationId, :applicantId, :appliedPosition, :jobApplicationDate, :status, :availableStartDate, :expectedSalary, :resumeFileUrl, :agreesToDrugTest, 1, CURRENT_DATE, NOW()) '
        . 'ON DUPLICATE KEY UPDATE '
        . 'appliedPosition = VALUES(appliedPosition), '
        . 'JobApplicationDate = VALUES(JobApplicationDate), '
        . 'JobApplicationStatus = VALUES(JobApplicationStatus), '
        . 'availableStartDate = VALUES(availableStartDate), '
        . 'expectedSalary = VALUES(expectedSalary), '
        . 'resumeFileUrl = VALUES(resumeFileUrl), '
        . 'agreesToDrugTest = VALUES(agreesToDrugTest), '
        . 'lastUpdated = NOW()'
    );

    $statement->execute([
        'jobApplicationId' => $jobApplicationId,
        'applicantId' => $applicantId,
        'appliedPosition' => (string)$jobApplication['appliedPosition'],
        'jobApplicationDate' => (string)$jobApplication['JobApplicationDate'],
        'status' => (string)($jobApplication['JobApplicationStatus'] ?? 'Pending'),
        'availableStartDate' => $jobApplication['availableStartDate'] ?: null,
        'expectedSalary' => $jobApplication['expectedSalary'] !== '' ? $jobApplication['expectedSalary'] : null,
        'resumeFileUrl' => $jobApplication['resumeFileUrl'] ?: null,
        'agreesToDrugTest' => (int)($jobApplication['agreesToDrugTest'] ?? 0),
    ]);

    $db->commit();

    jsonResponse(200, [
        'success' => true,
        'data' => [
            'jobApplicationId' => $jobApplicationId,
        ],
    ]);
} catch (Throwable $error) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    jsonResponse(500, [
        'success' => false,
        'message' => 'Application could not be updated.',
    ]);
}
