<?php

declare(strict_types=1);

require_once __DIR__ . '/../../index.php';
require_once __DIR__ . '/../auth/require_auth.php';

[$db, $user] = requireAuthUser();
$input = readJsonInput();
$applicant = is_array($input['applicant'] ?? null) ? $input['applicant'] : [];
$jobApplication = is_array($input['jobApplication'] ?? null) ? $input['jobApplication'] : [];

$applicantId = (string)$user['applicantId'];
$jobApplicationId = (string)($jobApplication['JobApplicationId'] ?? '');

if ($jobApplicationId === '') {
    jsonResponse(422, [
        'success' => false,
        'message' => 'JobApplicationId is required.',
    ]);
    exit;
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

    if (!empty($applicant)) {
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
    }



    $statement = $db->prepare(
        'INSERT INTO JobApplication (JobApplicationId, applicantId, appliedPosition, JobApplicationDate, JobApplicationStatus, availableStartDate, expectedSalary, resumeFileUrl, agreesToDrugTest, agreedToTerms, dateAgreed, lastUpdated) '
        . 'VALUES (:jobApplicationId, :applicantId, :appliedPosition, :jobApplicationDate, :status, :availableStartDate, :expectedSalary, :resumeFileUrl, :agreesToDrugTest, :agreedToTerms, :dateAgreed, NOW()) '
        . 'ON DUPLICATE KEY UPDATE '
        . 'appliedPosition = VALUES(appliedPosition), '
        . 'JobApplicationDate = VALUES(JobApplicationDate), '
        . 'JobApplicationStatus = VALUES(JobApplicationStatus), '
        . 'availableStartDate = VALUES(availableStartDate), '
        . 'expectedSalary = VALUES(expectedSalary), '
        . 'resumeFileUrl = VALUES(resumeFileUrl), '
        . 'agreesToDrugTest = VALUES(agreesToDrugTest), '
        . 'agreedToTerms = VALUES(agreedToTerms), '
        . 'dateAgreed = VALUES(dateAgreed), '
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
        'agreedToTerms' => (int)($jobApplication['agreedToTerms'] ?? 0),
        'dateAgreed' => !empty($jobApplication['dateAgreed']) ? $jobApplication['dateAgreed'] : date('Y-m-d H:i:s'),
    ]);

    // Insert/update education (find or create School)
    if (isset($input['education']) && is_array($input['education'])) {
        $stmtFindSchool = $db->prepare('SELECT schoolId FROM School WHERE schoolName = :name AND schoolLocation = :loc LIMIT 1');
        $stmtInsertSchool = $db->prepare('INSERT INTO School (schoolId, schoolName, schoolLocation) VALUES (:schoolId, :schoolName, :schoolLocation)');
        $stmtEd = $db->prepare('INSERT INTO Education (educationId, applicantId, schoolId, startYear, endYear, degreeReceived, programName) VALUES (:educationId, :applicantId, :schoolId, :startYear, :endYear, :degreeReceived, :programName) ON DUPLICATE KEY UPDATE schoolId=VALUES(schoolId), startYear=VALUES(startYear), endYear=VALUES(endYear), degreeReceived=VALUES(degreeReceived), programName=VALUES(programName)');

        foreach ($input['education'] as $ed) {
            $schoolName = (string)($ed['schoolName'] ?? '');
            $schoolLocation = (string)($ed['schoolLocation'] ?? '');
            $stmtFindSchool->execute(['name' => $schoolName, 'loc' => $schoolLocation]);
            $found = $stmtFindSchool->fetch(PDO::FETCH_ASSOC);
            if ($found && !empty($found['schoolId'])) {
                $schoolId = $found['schoolId'];
            } else {
                $schoolId = bin2hex(random_bytes(8));
                $stmtInsertSchool->execute(['schoolId' => $schoolId, 'schoolName' => $schoolName, 'schoolLocation' => $schoolLocation]);
            }

            $edId = !empty($ed['educationId']) ? $ed['educationId'] : bin2hex(random_bytes(8));
            $stmtEd->execute([
                'educationId' => $edId,
                'applicantId' => $applicantId,
                'schoolId' => $schoolId,
                'startYear' => $ed['startYear'] ?? null,
                'endYear' => $ed['endYear'] ?? null,
                'degreeReceived' => $ed['degreeReceived'] ?? '',
                'programName' => $ed['programName'] ?? ''
            ]);
        }
    }

    // Insert/update employment history (require startDate and endDate, find-or-create Company)
    if (isset($input['employmentHistory']) && is_array($input['employmentHistory'])) {
        $stmtFindCompany = $db->prepare('SELECT companyId FROM Company WHERE companyName = :name AND companyAddress = :addr LIMIT 1');
        $stmtInsertCompany = $db->prepare('INSERT INTO Company (companyId, companyName, companyAddress, companyPhone) VALUES (:companyId, :companyName, :companyAddress, :companyPhone)');
        $stmtEmp = $db->prepare('INSERT INTO EmploymentHistory (EmploymentHistoryId, applicantId, companyId, workPosition, reasonForLeaving, startDate, endDate, isEmployed) VALUES (:empId, :applicantId, :companyId, :workPosition, :reasonForLeaving, :startDate, :endDate, :isEmployed) ON DUPLICATE KEY UPDATE companyId=VALUES(companyId), workPosition=VALUES(workPosition), reasonForLeaving=VALUES(reasonForLeaving), startDate=VALUES(startDate), endDate=VALUES(endDate), isEmployed=VALUES(isEmployed)');

        foreach ($input['employmentHistory'] as $emp) {
            if (empty($emp['startDate']) || empty($emp['endDate'])) {
                jsonResponse(422, ['success' => false, 'message' => 'Each employment entry requires both startDate and endDate.']);
            }

            $companyName = (string)($emp['companyName'] ?? '');
            $companyAddr = (string)($emp['companyAddress'] ?? '');
            $stmtFindCompany->execute(['name' => $companyName, 'addr' => $companyAddr]);
            $foundC = $stmtFindCompany->fetch(PDO::FETCH_ASSOC);
            if ($foundC && !empty($foundC['companyId'])) {
                $companyId = $foundC['companyId'];
            } else {
                $companyId = bin2hex(random_bytes(8));
                $stmtInsertCompany->execute(['companyId' => $companyId, 'companyName' => $companyName, 'companyAddress' => $companyAddr, 'companyPhone' => $emp['companyPhone'] ?? '']);
            }

            $empId = !empty($emp['EmploymentHistoryId']) ? $emp['EmploymentHistoryId'] : bin2hex(random_bytes(8));
            $stmtEmp->execute([
                'empId' => $empId,
                'applicantId' => $applicantId,
                'companyId' => $companyId,
                'workPosition' => $emp['workPosition'] ?? '',
                'reasonForLeaving' => $emp['reasonForLeaving'] ?? null,
                'startDate' => $emp['startDate'],
                'endDate' => $emp['endDate'],
                'isEmployed' => (int)($emp['isEmployed'] ?? 0)
            ]);
        }
    }

    // Insert/update certificates
    if (isset($input['certificates']) && is_array($input['certificates'])) {
        $stmtFindCert = $db->prepare('SELECT certificateId FROM Certificate WHERE certificateName = :name AND issuingAuthority = :authority LIMIT 1');
        $stmtCert = $db->prepare('INSERT INTO Certificate (certificateId, certificateName, issuingAuthority, validityMonths) VALUES (:certId, :certName, :authority, :validity) ON DUPLICATE KEY UPDATE certificateName=VALUES(certificateName), issuingAuthority=VALUES(issuingAuthority), validityMonths=VALUES(validityMonths)');
        $stmtAppCert = $db->prepare('INSERT INTO ApplicantCertificate (applicantId, certificateId, dateIssued) VALUES (:applicantId, :certId, :dateIssued) ON DUPLICATE KEY UPDATE dateIssued=VALUES(dateIssued)');

        foreach ($input['certificates'] as $cert) {
            $certName = (string)($cert['certificateName'] ?? '');
            $authority = (string)($cert['issuingAuthority'] ?? '');
            $certId = !empty($cert['certificateId']) ? (string)$cert['certificateId'] : '';

            if ($certId === '') {
                $stmtFindCert->execute(['name' => $certName, 'authority' => $authority]);
                $foundCert = $stmtFindCert->fetch(PDO::FETCH_ASSOC);
                if ($foundCert && !empty($foundCert['certificateId'])) {
                    $certId = (string)$foundCert['certificateId'];
                }
            }

            if ($certId === '') {
                $certId = bin2hex(random_bytes(8));
            }

            $stmtCert->execute([
                'certId' => $certId,
                'certName' => $certName,
                'authority' => $authority,
                'validity' => $cert['validityMonths'] ?? 0
            ]);
            $stmtAppCert->execute([
                'applicantId' => $applicantId,
                'certId' => $certId,
                'dateIssued' => !empty($cert['dateIssued']) ? $cert['dateIssued'] : date('Y-m-d')
            ]);
        }
    }

    // Insert/update trainings
    if (isset($input['trainings']) && is_array($input['trainings'])) {
        $stmtFindTrain = $db->prepare('SELECT trainingId FROM Training WHERE trainingTitle = :title LIMIT 1');
        $stmtTrain = $db->prepare('INSERT INTO Training (trainingId, trainingTitle, trainingDescription, trainingDurationHours) VALUES (:trainId, :title, :desc, :duration) ON DUPLICATE KEY UPDATE trainingTitle=VALUES(trainingTitle), trainingDescription=VALUES(trainingDescription), trainingDurationHours=VALUES(trainingDurationHours)');
        $stmtAppTrain = $db->prepare('INSERT INTO ApplicantTraining (applicantId, trainingId, completionDate, trainingInstructor) VALUES (:applicantId, :trainId, :completionDate, :instructor) ON DUPLICATE KEY UPDATE completionDate=VALUES(completionDate), trainingInstructor=VALUES(trainingInstructor)');

        foreach ($input['trainings'] as $train) {
            $trainTitle = (string)($train['trainingTitle'] ?? '');
            $trainId = !empty($train['trainingId']) ? (string)$train['trainingId'] : '';

            if ($trainId === '') {
                $stmtFindTrain->execute(['title' => $trainTitle]);
                $foundTrain = $stmtFindTrain->fetch(PDO::FETCH_ASSOC);
                if ($foundTrain && !empty($foundTrain['trainingId'])) {
                    $trainId = (string)$foundTrain['trainingId'];
                }
            }

            if ($trainId === '') {
                $trainId = bin2hex(random_bytes(8));
            }

            $stmtTrain->execute([
                'trainId' => $trainId,
                'title' => $trainTitle,
                'desc' => $train['trainingDescription'] ?? '',
                'duration' => $train['trainingDurationHours'] ?? 0
            ]);
            $stmtAppTrain->execute([
                'applicantId' => $applicantId,
                'trainId' => $trainId,
                'completionDate' => !empty($train['completionDate']) ? $train['completionDate'] : date('Y-m-d'),
                'instructor' => $train['trainingInstructor'] ?? null
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

    // Insert/update References
    if (isset($input['references']) && is_array($input['references'])) {
        $stmtRef = $db->prepare('INSERT INTO Reference (referenceId, JobApplicationId, referenceName, referenceTitle, referenceCompany, referencePhone, referenceEmail) VALUES (:referenceId, :jobApplicationId, :referenceName, :referenceTitle, :referenceCompany, :referencePhone, :referenceEmail) ON DUPLICATE KEY UPDATE referenceName=VALUES(referenceName), referenceTitle=VALUES(referenceTitle), referenceCompany=VALUES(referenceCompany), referencePhone=VALUES(referencePhone), referenceEmail=VALUES(referenceEmail), JobApplicationId=VALUES(JobApplicationId)');
        foreach ($input['references'] as $ref) {
            $refId = !empty($ref['referenceId']) ? $ref['referenceId'] : bin2hex(random_bytes(8));
            $stmtRef->execute([
                'referenceId' => $refId,
                'jobApplicationId' => $jobApplicationId,
                'referenceName' => $ref['referenceName'] ?? '',
                'referenceTitle' => $ref['referenceTitle'] ?? '',
                'referenceCompany' => $ref['referenceCompany'] ?? '',
                'referencePhone' => $ref['referencePhone'] ?? '',
                'referenceEmail' => $ref['referenceEmail'] ?? ''
            ]);
        }
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