<?php

declare(strict_types=1);

require_once __DIR__ . '/../../index.php';
require_once __DIR__ . '/../auth/require_auth.php';

$db = requireAuthUser(); // rename to get db connection
$input = readJsonInput();
$applicant = is_array($input['applicant'] ?? null) ? $input['applicant'] : [];
$jobApplication = is_array($input['jobApplication'] ?? null) ? $input['jobApplication'] : [];

$applicantId = (string)$applicant['applicantId']; // Your original line

// --- ADD THIS TEMPORARY DEBUGGING BLOCK ---
if ($applicantId === '' || $applicantId === null) {
    jsonResponse(400, [
        'success' => false,
        'message' => 'DEBUG: The applicantId is empty! Check your array keys.',
        'debug_input' => $input 
    ]);
    exit;
}
// ------------------------------------------
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

    // --- ADD THIS CHECK ---
    $checkUser = $db->prepare("SELECT applicantId FROM Applicant WHERE applicantId = :id");
    $checkUser->execute(['id' => $applicantId]);
    
    if ($checkUser->rowCount() === 0) {
        // If the database can't find this ID, stop everything and print it out!
        jsonResponse(404, [
            'success' => false,
            'message' => "DEBUG FATAL: The token contains applicantId: '{$applicantId}', but this ID does NOT exist in the Applicant table in your database. Check if register.php actually inserted it!"
        ]);
        exit;
    }

    // The $statement->rowCount() check has been successfully removed from here

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

    // Insert/update education
    if (isset($input['education']) && is_array($input['education'])) {
        $stmtSchool = $db->prepare('INSERT INTO School (schoolId, schoolName, schoolLocation) VALUES (:schoolId, :schoolName, :schoolLocation) ON DUPLICATE KEY UPDATE schoolName=VALUES(schoolName), schoolLocation=VALUES(schoolLocation)');
        $stmtEd = $db->prepare('INSERT INTO Education (educationId, applicantId, schoolId, startYear, endYear, degreeReceived, programName) VALUES (:educationId, :applicantId, :schoolId, :startYear, :endYear, :degreeReceived, :programName) ON DUPLICATE KEY UPDATE schoolId=VALUES(schoolId), startYear=VALUES(startYear), endYear=VALUES(endYear), degreeReceived=VALUES(degreeReceived), programName=VALUES(programName)');
        
        foreach ($input['education'] as $ed) {
            $schoolId = !empty($ed['schoolId']) ? $ed['schoolId'] : rand(100000, 999999);
            $stmtSchool->execute([
                'schoolId' => $schoolId,
                'schoolName' => $ed['schoolName'] ?? '',
                'schoolLocation' => $ed['schoolLocation'] ?? ''
            ]);
            $edId = !empty($ed['educationId']) ? $ed['educationId'] : rand(100000, 999999);
            $stmtEd->execute([
                'educationId' => $edId,
                'applicantId' => $applicantId,
                'schoolId' => $schoolId,
                'startYear' => $ed['startYear'] ?? date('Y'),
                'endYear' => $ed['endYear'] ?? date('Y'),
                'degreeReceived' => $ed['degreeReceived'] ?? '',
                'programName' => $ed['programName'] ?? ''
            ]);
        }
    }

    // Insert/update employment history
    if (isset($input['employmentHistory']) && is_array($input['employmentHistory'])) {
        $stmtCompany = $db->prepare('INSERT INTO Company (companyId, companyName, companyAddress, companyPhone) VALUES (:companyId, :companyName, :companyAddress, :companyPhone) ON DUPLICATE KEY UPDATE companyName=VALUES(companyName), companyAddress=VALUES(companyAddress), companyPhone=VALUES(companyPhone)');
        $stmtEmp = $db->prepare('INSERT INTO EmploymentHistory (EmploymentHistoryId, applicantId, companyId, workPosition, reasonForLeaving, startDate, endDate, isEmployed) VALUES (:empId, :applicantId, :companyId, :workPosition, :reasonForLeaving, :startDate, :endDate, :isEmployed) ON DUPLICATE KEY UPDATE companyId=VALUES(companyId), workPosition=VALUES(workPosition), reasonForLeaving=VALUES(reasonForLeaving), startDate=VALUES(startDate), endDate=VALUES(endDate), isEmployed=VALUES(isEmployed)');
        
        foreach ($input['employmentHistory'] as $emp) {
            $companyId = !empty($emp['companyId']) ? $emp['companyId'] : rand(100000, 999999);
            $stmtCompany->execute([
                'companyId' => $companyId,
                'companyName' => $emp['companyName'] ?? '',
                'companyAddress' => $emp['companyAddress'] ?? '',
                'companyPhone' => $emp['companyPhone'] ?? ''
            ]);
            $empId = !empty($emp['EmploymentHistoryId']) ? $emp['EmploymentHistoryId'] : rand(100000, 999999);
            $stmtEmp->execute([
                'empId' => $empId,
                'applicantId' => $applicantId,
                'companyId' => $companyId,
                'workPosition' => $emp['workPosition'] ?? '',
                'reasonForLeaving' => $emp['reasonForLeaving'] ?? null,
                'startDate' => (!empty($emp['startDate'])) ? $emp['startDate'] : date('Y-m-d'),
                'endDate' => (!empty($emp['endDate'])) ? $emp['endDate'] : date('Y-m-d'),
                'isEmployed' => (int)($emp['isEmployed'] ?? 0)
            ]);
        }
    }

    // Insert/update certificates
    if (isset($input['certificates']) && is_array($input['certificates'])) {
        $stmtCert = $db->prepare('INSERT INTO Certificate (certificateId, certificateName, issuingAuthority, validityMonths) VALUES (:certId, :certName, :authority, :validity) ON DUPLICATE KEY UPDATE certificateName=VALUES(certificateName), issuingAuthority=VALUES(issuingAuthority), validityMonths=VALUES(validityMonths)');
        $stmtAppCert = $db->prepare('INSERT INTO ApplicantCertificate (applicantId, certificateId, dateIssued) VALUES (:applicantId, :certId, :dateIssued) ON DUPLICATE KEY UPDATE dateIssued=VALUES(dateIssued)');
        
        foreach ($input['certificates'] as $cert) {
            $certId = !empty($cert['certificateId']) ? $cert['certificateId'] : rand(100000, 999999);
            $stmtCert->execute([
                'certId' => $certId,
                'certName' => $cert['certificateName'] ?? '',
                'authority' => $cert['issuingAuthority'] ?? '',
                'validity' => $cert['validityMonths'] ?? 0
            ]);
            $stmtAppCert->execute([
                'applicantId' => $applicantId,
                'certId' => $certId,
                'dateIssued' => (!empty($cert['dateIssued'])) ? $cert['dateIssued'] : date('Y-m-d')
            ]);
        }
    }

    // Insert/update trainings
    if (isset($input['trainings']) && is_array($input['trainings'])) {
        $stmtTrain = $db->prepare('INSERT INTO Training (trainingId, trainingTitle, trainingDescription, trainingInstructor, trainingDurationHours) VALUES (:trainId, :title, :desc, :instructor, :duration) ON DUPLICATE KEY UPDATE trainingTitle=VALUES(trainingTitle), trainingDescription=VALUES(trainingDescription), trainingInstructor=VALUES(trainingInstructor), trainingDurationHours=VALUES(trainingDurationHours)');
        $stmtAppTrain = $db->prepare('INSERT INTO ApplicantTraining (applicantId, trainingId, completionDate) VALUES (:applicantId, :trainId, :completionDate) ON DUPLICATE KEY UPDATE completionDate=VALUES(completionDate)');
        
        foreach ($input['trainings'] as $train) {
            $trainId = !empty($train['trainingId']) ? $train['trainingId'] : rand(100000, 999999);
            $stmtTrain->execute([
                'trainId' => $trainId,
                'title' => $train['trainingTitle'] ?? '',
                'desc' => $train['trainingDescription'] ?? '',
                'instructor' => $train['trainingInstructor'] ?? '',
                'duration' => $train['trainingDurationHours'] ?? 0
            ]);
            $stmtAppTrain->execute([
                'applicantId' => $applicantId,
                'trainId' => $trainId,
                'completionDate' => (!empty($train['completionDate'])) ? $train['completionDate'] : date('Y-m-d')
            ]);
        }
    }

    // Insert/update ApplicationResumeSettings
    if (isset($input['resumeSettings']) && is_array($input['resumeSettings'])) {
        $resumeSettings = $input['resumeSettings'];
        $stmtSettings = $db->prepare(
            'INSERT INTO ApplicationResumeSettings (JobApplicationId, resumeTemplate, previewFont) '
            . 'VALUES (:jobApplicationId, :resumeTemplate, :previewFont) '
            . 'ON DUPLICATE KEY UPDATE '
            . 'resumeTemplate = VALUES(resumeTemplate), '
            . 'previewFont = VALUES(previewFont), '
            . 'lastUpdated = CURRENT_TIMESTAMP'
        );
        $stmtSettings->execute([
            'jobApplicationId' => $jobApplicationId,
            'resumeTemplate' => (string)($resumeSettings['resumeTemplate'] ?? 'classic'),
            'previewFont' => (string)($resumeSettings['previewFont'] ?? 'Helvetica'),
        ]);
    }

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
    
    // Detailed error reporting for the frontend
    jsonResponse(500, [
        'success' => false,
        'message' => 'Database Error: ' . $error->getMessage(), // Exposes the exact SQL/PHP error
        'file' => $error->getFile(),
        'line' => $error->getLine()
    ]);
}