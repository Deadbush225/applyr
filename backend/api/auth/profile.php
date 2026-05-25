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
        'SELECT applicantId, applicantName, homeAddress, phoneNumber, emailAddress, linkedInUrl, citizenshipStatus, hasCriminalHistory '
        . 'FROM Applicant '
        . 'WHERE applicantId = :applicantId LIMIT 1'
    );
    $statement->execute(['applicantId' => $applicantId]);
    $profile = $statement->fetch(PDO::FETCH_ASSOC);

    if (!$profile) {
        jsonResponse(404, [
            'success' => false,
            'message' => 'Applicant not found.',
        ]);
        exit;
    }

    // Fetch Education
    $stmtEdu = $db->prepare('SELECT e.*, s.schoolName, s.schoolLocation FROM Education e LEFT JOIN School s ON e.schoolId = s.schoolId WHERE e.applicantId = :applicantId');
    $stmtEdu->execute(['applicantId' => $applicantId]);
    $education = $stmtEdu->fetchAll(PDO::FETCH_ASSOC);

    // Fetch EmploymentHistory
    $stmtEmp = $db->prepare('SELECT e.*, c.companyName, c.companyAddress, c.companyPhone FROM EmploymentHistory e LEFT JOIN Company c ON e.companyId = c.companyId WHERE e.applicantId = :applicantId');
    $stmtEmp->execute(['applicantId' => $applicantId]);
    $employmentHistory = $stmtEmp->fetchAll(PDO::FETCH_ASSOC);

    // Fetch Certificates
    $stmtCert = $db->prepare('SELECT c.certificateId, c.certificateName, c.issuingAuthority, c.validityMonths, ac.dateIssued, ac.applicantId FROM Certificate c JOIN ApplicantCertificate ac ON c.certificateId = ac.certificateId WHERE ac.applicantId = :applicantId');
    $stmtCert->execute(['applicantId' => $applicantId]);
    $certificates = $stmtCert->fetchAll(PDO::FETCH_ASSOC);

    // Fetch Trainings
    $stmtTrain = $db->prepare('SELECT t.trainingId, t.trainingTitle, t.trainingDescription, t.trainingDurationHours, at.completionDate, at.trainingInstructor, at.applicantId FROM Training t JOIN ApplicantTraining at ON t.trainingId = at.trainingId WHERE at.applicantId = :applicantId');
    $stmtTrain->execute(['applicantId' => $applicantId]);
    $trainings = $stmtTrain->fetchAll(PDO::FETCH_ASSOC);

    $profile['education'] = $education;
    $profile['employmentHistory'] = $employmentHistory;
    $profile['certificates'] = $certificates;
    $profile['trainings'] = $trainings;

    jsonResponse(200, [
        'success' => true,
        'data' => $profile,
    ]);
} catch (Throwable $error) {
    jsonResponse(500, [
        'success' => false,
        'message' => 'Failed to load applicant profile.',
    ]);
}
