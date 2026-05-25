<?php

declare(strict_types=1);

require_once __DIR__ . '/../../index.php';
require_once __DIR__ . '/../auth/require_auth.php';

[$db, $user] = requireAuthUser();
$input = readJsonInput();
$applicantId = (string)$user['applicantId'];

// Verify user is updating their own profile
if ($applicantId !== (string)($input['applicantId'] ?? '')) {
    jsonResponse(403, [
        'success' => false,
        'message' => 'You can only update your own profile.',
    ]);
    exit;
}

try {
    $db->beginTransaction();

    $education = isset($input['education']) && is_array($input['education']) ? $input['education'] : [];
    $employmentHistory = isset($input['employmentHistory']) && is_array($input['employmentHistory']) ? $input['employmentHistory'] : [];
    $trainings = isset($input['trainings']) && is_array($input['trainings']) ? $input['trainings'] : [];
    $certificates = isset($input['certificates']) && is_array($input['certificates']) ? $input['certificates'] : [];

    $db->prepare('DELETE FROM Education WHERE applicantId = :applicantId')->execute(['applicantId' => $applicantId]);
    $db->prepare('DELETE FROM EmploymentHistory WHERE applicantId = :applicantId')->execute(['applicantId' => $applicantId]);
    $db->prepare('DELETE FROM ApplicantTraining WHERE applicantId = :applicantId')->execute(['applicantId' => $applicantId]);
    $db->prepare('DELETE FROM ApplicantCertificate WHERE applicantId = :applicantId')->execute(['applicantId' => $applicantId]);

    if ($education !== []) {
        $stmtFindSchool = $db->prepare('SELECT schoolId FROM School WHERE schoolName = :name AND schoolLocation = :loc LIMIT 1');
        $stmtInsertSchool = $db->prepare('INSERT INTO School (schoolId, schoolName, schoolLocation) VALUES (:schoolId, :schoolName, :schoolLocation)');
        $stmtEducation = $db->prepare('INSERT INTO Education (educationId, applicantId, schoolId, startYear, endYear, degreeReceived, programName) VALUES (:educationId, :applicantId, :schoolId, :startYear, :endYear, :degreeReceived, :programName)');

        foreach ($education as $entry) {
            $schoolName = (string)($entry['schoolName'] ?? '');
            $schoolLocation = (string)($entry['schoolLocation'] ?? '');
            $stmtFindSchool->execute(['name' => $schoolName, 'loc' => $schoolLocation]);
            $found = $stmtFindSchool->fetch(PDO::FETCH_ASSOC);
            if ($found && !empty($found['schoolId'])) {
                $schoolId = (string)$found['schoolId'];
            } else {
                $schoolId = bin2hex(random_bytes(8));
                $stmtInsertSchool->execute([
                    'schoolId' => $schoolId,
                    'schoolName' => $schoolName,
                    'schoolLocation' => $schoolLocation,
                ]);
            }

            $stmtEducation->execute([
                'educationId' => !empty($entry['educationId']) ? (string)$entry['educationId'] : bin2hex(random_bytes(8)),
                'applicantId' => $applicantId,
                'schoolId' => $schoolId,
                'startYear' => $entry['startYear'] ?? null,
                'endYear' => $entry['endYear'] ?? null,
                'degreeReceived' => (string)($entry['degreeReceived'] ?? ''),
                'programName' => (string)($entry['programName'] ?? ''),
            ]);
        }
    }

    if ($employmentHistory !== []) {
        $stmtFindCompany = $db->prepare('SELECT companyId FROM Company WHERE companyName = :name AND companyAddress = :addr LIMIT 1');
        $stmtInsertCompany = $db->prepare('INSERT INTO Company (companyId, companyName, companyAddress, companyPhone) VALUES (:companyId, :companyName, :companyAddress, :companyPhone)');
        $stmtEmployment = $db->prepare('INSERT INTO EmploymentHistory (EmploymentHistoryId, applicantId, companyId, workPosition, reasonForLeaving, startDate, endDate, isEmployed) VALUES (:employmentHistoryId, :applicantId, :companyId, :workPosition, :reasonForLeaving, :startDate, :endDate, :isEmployed)');

        foreach ($employmentHistory as $entry) {
            $companyName = (string)($entry['companyName'] ?? '');
            $companyAddress = (string)($entry['companyAddress'] ?? '');
            $stmtFindCompany->execute(['name' => $companyName, 'addr' => $companyAddress]);
            $found = $stmtFindCompany->fetch(PDO::FETCH_ASSOC);
            if ($found && !empty($found['companyId'])) {
                $companyId = (string)$found['companyId'];
            } else {
                $companyId = bin2hex(random_bytes(8));
                $stmtInsertCompany->execute([
                    'companyId' => $companyId,
                    'companyName' => $companyName,
                    'companyAddress' => $companyAddress,
                    'companyPhone' => (string)($entry['companyPhone'] ?? ''),
                ]);
            }

            $stmtEmployment->execute([
                'employmentHistoryId' => !empty($entry['EmploymentHistoryId']) ? (string)$entry['EmploymentHistoryId'] : bin2hex(random_bytes(8)),
                'applicantId' => $applicantId,
                'companyId' => $companyId,
                'workPosition' => (string)($entry['workPosition'] ?? ''),
                'reasonForLeaving' => $entry['reasonForLeaving'] ?? null,
                'startDate' => $entry['startDate'] ?? null,
                'endDate' => $entry['endDate'] ?? null,
                'isEmployed' => (int)($entry['isEmployed'] ?? 0),
            ]);
        }
    }

    if ($certificates !== []) {
        $stmtFindCert = $db->prepare('SELECT certificateId FROM Certificate WHERE certificateName = :name AND issuingAuthority = :authority LIMIT 1');
        $stmtCert = $db->prepare('INSERT INTO Certificate (certificateId, certificateName, issuingAuthority, validityMonths) VALUES (:certificateId, :certificateName, :issuingAuthority, :validityMonths) ON DUPLICATE KEY UPDATE certificateName = VALUES(certificateName), issuingAuthority = VALUES(issuingAuthority), validityMonths = VALUES(validityMonths)');
        $stmtAppCert = $db->prepare('INSERT INTO ApplicantCertificate (applicantId, certificateId, dateIssued) VALUES (:applicantId, :certificateId, :dateIssued) ON DUPLICATE KEY UPDATE dateIssued = VALUES(dateIssued)');

        foreach ($certificates as $entry) {
            $certificateName = (string)($entry['certificateName'] ?? '');
            $issuingAuthority = (string)($entry['issuingAuthority'] ?? '');
            $certificateId = !empty($entry['certificateId']) ? (string)$entry['certificateId'] : '';

            if ($certificateId === '') {
                $stmtFindCert->execute(['name' => $certificateName, 'authority' => $issuingAuthority]);
                $found = $stmtFindCert->fetch(PDO::FETCH_ASSOC);
                if ($found && !empty($found['certificateId'])) {
                    $certificateId = (string)$found['certificateId'];
                }
            }

            if ($certificateId === '') {
                $certificateId = bin2hex(random_bytes(8));
            }

            $stmtCert->execute([
                'certificateId' => $certificateId,
                'certificateName' => $certificateName,
                'issuingAuthority' => $issuingAuthority,
                'validityMonths' => $entry['validityMonths'] ?? 0,
            ]);
            $stmtAppCert->execute([
                'applicantId' => $applicantId,
                'certificateId' => $certificateId,
                'dateIssued' => $entry['dateIssued'] ?? date('Y-m-d'),
            ]);
        }
    }

    if ($trainings !== []) {
        $stmtFindTrain = $db->prepare('SELECT trainingId FROM Training WHERE trainingTitle = :title LIMIT 1');
        $stmtTrain = $db->prepare('INSERT INTO Training (trainingId, trainingTitle, trainingDescription, trainingDurationHours) VALUES (:trainingId, :trainingTitle, :trainingDescription, :trainingDurationHours) ON DUPLICATE KEY UPDATE trainingTitle = VALUES(trainingTitle), trainingDescription = VALUES(trainingDescription), trainingDurationHours = VALUES(trainingDurationHours)');
        $stmtAppTrain = $db->prepare('INSERT INTO ApplicantTraining (applicantId, trainingId, completionDate, trainingInstructor) VALUES (:applicantId, :trainingId, :completionDate, :trainingInstructor) ON DUPLICATE KEY UPDATE completionDate = VALUES(completionDate), trainingInstructor = VALUES(trainingInstructor)');

        foreach ($trainings as $entry) {
            $trainingTitle = (string)($entry['trainingTitle'] ?? '');
            $trainingId = !empty($entry['trainingId']) ? (string)$entry['trainingId'] : '';

            if ($trainingId === '') {
                $stmtFindTrain->execute(['title' => $trainingTitle]);
                $found = $stmtFindTrain->fetch(PDO::FETCH_ASSOC);
                if ($found && !empty($found['trainingId'])) {
                    $trainingId = (string)$found['trainingId'];
                }
            }

            if ($trainingId === '') {
                $trainingId = bin2hex(random_bytes(8));
            }

            $stmtTrain->execute([
                'trainingId' => $trainingId,
                'trainingTitle' => $trainingTitle,
                'trainingDescription' => (string)($entry['trainingDescription'] ?? ''),
                'trainingDurationHours' => $entry['trainingDurationHours'] ?? 0,
            ]);
            $stmtAppTrain->execute([
                'applicantId' => $applicantId,
                'trainingId' => $trainingId,
                'completionDate' => $entry['completionDate'] ?? date('Y-m-d'),
                'trainingInstructor' => $entry['trainingInstructor'] ?? null,
            ]);
        }
    }

    $db->commit();

    jsonResponse(200, [
        'success' => true,
        'data' => [
            'applicantId' => $applicantId,
        ],
    ]);
} catch (Throwable $error) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }

    jsonResponse(500, [
        'success' => false,
        'message' => 'Failed to sync applicant profile.',
    ]);
}
