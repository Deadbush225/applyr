<?php

declare(strict_types=1);

require_once __DIR__ . '/../../index.php';
require_once __DIR__ . '/../auth/require_auth.php';

[$db, $user] = requireAuthUser();
$input = readJsonInput();
$applicant = is_array($input['applicant'] ?? null) ? $input['applicant'] : [];
$jobApplication = is_array($input['jobApplication'] ?? null) ? $input['jobApplication'] : [];

$applicantId = (string)$user['applicantId'];

// Helper to generate a UUID v4 for JobApplicationId
function uuidv4(): string
{
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
    $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

$jobApplicationId = (string)($jobApplication['JobApplicationId'] ?? uuidv4());

$defaults = [
    'appliedPosition' => '',
    'JobApplicationDate' => date('Y-m-d'),
    'availableStartDate' => null,
    'expectedSalary' => null,
    'resumeFileUrl' => null,
    'agreesToDrugTest' => 0,
];

$jobApplication = array_merge($defaults, $jobApplication);

// Validate expectedSalary: must be numeric and non-negative when provided
$expectedSalaryRaw = $jobApplication['expectedSalary'] ?? null;
if ($expectedSalaryRaw !== null && $expectedSalaryRaw !== '') {
    if (!is_numeric($expectedSalaryRaw) || floatval($expectedSalaryRaw) < 0) {
        jsonResponse(422, ['success' => false, 'message' => 'Expected salary cannot be negative.']);
        exit;
    }
}

// Validate JobApplicationDate: must be YYYY-MM-DD and not earlier than today
function is_valid_date_ymd(string $s): bool
{
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $s)) {
        return false;
    }

    $ts = strtotime($s);
    if ($ts === false) {
        return false;
    }

    return date('Y-m-d', $ts) === $s;
}

$jobAppDate = (string)($jobApplication['JobApplicationDate'] ?? '');
if ($jobAppDate !== '') {
    if (!is_valid_date_ymd($jobAppDate)) {
        jsonResponse(422, ['success' => false, 'message' => 'JobApplicationDate must be a valid date (YYYY-MM-DD).']);
        exit;
    }

    $today = date('Y-m-d');
    if (strtotime($jobAppDate) < strtotime($today)) {
        jsonResponse(422, ['success' => false, 'message' => 'Job application date cannot be earlier than today.']);
        exit;
    }
}

if ($jobApplication['appliedPosition'] === '') {
    jsonResponse(422, [
        'success' => false,
        'message' => 'Applied position is required.',
    ]);
}

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
        . 'VALUES (:jobApplicationId, :applicantId, :appliedPosition, :jobApplicationDate, :status, :availableStartDate, :expectedSalary, :resumeFileUrl, :agreesToDrugTest, :agreedToTerms, :dateAgreed, NOW())'
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

    // Insert ApplicationResumeSettings with defaults
    $stmtSettings = $db->prepare(
        'INSERT INTO ApplicationResumeSettings (JobApplicationId, resumeTemplate, previewFont) '
        . 'VALUES (:jobApplicationId, :resumeTemplate, :previewFont)'
    );
    $stmtSettings->execute([
        'jobApplicationId' => $jobApplicationId,
        'resumeTemplate' => (string)($input['resumeSettings']['resumeTemplate'] ?? 'classic'),
        'previewFont' => (string)($input['resumeSettings']['previewFont'] ?? 'Times New Roman'),
    ]);

    // --- Education: find or create School and insert Education rows ---
    if (isset($input['education']) && is_array($input['education'])) {
        $stmtFindSchool = $db->prepare('SELECT schoolId FROM School WHERE schoolName = :name AND schoolLocation = :loc LIMIT 1');
        $stmtInsertSchool = $db->prepare('INSERT INTO School (schoolName, schoolLocation) VALUES (:schoolName, :schoolLocation)');
        $stmtEd = $db->prepare('INSERT INTO Education (applicantId, schoolId, startYear, endYear, degreeReceived, programName) VALUES (:applicantId, :schoolId, :startYear, :endYear, :degreeReceived, :programName)');

        foreach ($input['education'] as $ed) {
            $schoolName = (string)($ed['schoolName'] ?? '');
            $schoolLocation = (string)($ed['schoolLocation'] ?? '');

            $stmtFindSchool->execute(['name' => $schoolName, 'loc' => $schoolLocation]);
            $found = $stmtFindSchool->fetch(PDO::FETCH_ASSOC);
            if ($found && !empty($found['schoolId'])) {
                $schoolId = $found['schoolId'];
            } else {
                $stmtInsertSchool->execute(['schoolName' => $schoolName, 'schoolLocation' => $schoolLocation]);
                $schoolId = $db->lastInsertId();
            }

            $stmtEd->execute([
                'applicantId' => $applicantId,
                'schoolId' => $schoolId,
                'startYear' => $ed['startYear'] ?? null,
                'endYear' => $ed['endYear'] ?? null,
                'degreeReceived' => $ed['degreeReceived'] ?? '',
                'programName' => $ed['programName'] ?? ''
            ]);
        }
    }

    // --- Employment: require startDate and endDate; find-or-create Company ---
    if (isset($input['employmentHistory']) && is_array($input['employmentHistory'])) {
        $stmtFindCompany = $db->prepare('SELECT companyId FROM Company WHERE companyName = :name AND companyAddress = :addr LIMIT 1');
        $stmtInsertCompany = $db->prepare('INSERT INTO Company (companyName, companyAddress, companyPhone) VALUES (:companyName, :companyAddress, :companyPhone)');
        $stmtEmp = $db->prepare('INSERT INTO EmploymentHistory (applicantId, companyId, workPosition, reasonForLeaving, startDate, endDate, isEmployed) VALUES (:applicantId, :companyId, :workPosition, :reasonForLeaving, :startDate, :endDate, :isEmployed)');

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
                $stmtInsertCompany->execute(['companyName' => $companyName, 'companyAddress' => $companyAddr, 'companyPhone' => $emp['companyPhone'] ?? '']);
                $companyId = $db->lastInsertId();
            }

            $stmtEmp->execute([
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

    // --- Certificates: require dateIssued and map to ApplicantCertificate ---
    if (isset($input['certificates']) && is_array($input['certificates'])) {
        $stmtFindCert = $db->prepare('SELECT certificateId FROM Certificate WHERE certificateName = :name AND issuingAuthority = :authority LIMIT 1');
        $stmtCert = $db->prepare('INSERT INTO Certificate (certificateId, certificateName, issuingAuthority, validityMonths) VALUES (:certId, :certName, :authority, :validity) ON DUPLICATE KEY UPDATE certificateName=VALUES(certificateName), issuingAuthority=VALUES(issuingAuthority), validityMonths=VALUES(validityMonths)');
        $stmtAppCert = $db->prepare('INSERT INTO ApplicantCertificate (applicantId, certificateId, dateIssued) VALUES (:applicantId, :certId, :dateIssued) ON DUPLICATE KEY UPDATE dateIssued=VALUES(dateIssued)');

        foreach ($input['certificates'] as $cert) {
            if (empty($cert['dateIssued'])) {
                jsonResponse(422, ['success' => false, 'message' => 'Each certificate requires a dateIssued.']);
            }

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
                // Insert without explicit ID and capture the auto-incremented id
                $stmtCert = $db->prepare('INSERT INTO Certificate (certificateName, issuingAuthority, validityMonths) VALUES (:certName, :authority, :validity)');
                $stmtCert->execute([
                    'certName' => $certName,
                    'authority' => $authority,
                    'validity' => $cert['validityMonths'] ?? 0
                ]);
                $certId = $db->lastInsertId();
            } else {
                // Update existing certificate record
                $stmtCertUpdate = $db->prepare('UPDATE Certificate SET certificateName = :certName, issuingAuthority = :authority, validityMonths = :validity WHERE certificateId = :certId');
                $stmtCertUpdate->execute([
                    'certId' => $certId,
                    'certName' => $certName,
                    'authority' => $authority,
                    'validity' => $cert['validityMonths'] ?? 0
                ]);
            }

            $stmtAppCert->execute([
                'applicantId' => $applicantId,
                'certId' => $certId,
                'dateIssued' => $cert['dateIssued']
            ]);
        }
    }

    // --- Trainings: require completionDate and map to ApplicantTraining ---
    if (isset($input['trainings']) && is_array($input['trainings'])) {
        $stmtFindTrain = $db->prepare('SELECT trainingId FROM Training WHERE trainingTitle = :title LIMIT 1');
        $stmtTrain = $db->prepare('INSERT INTO Training (trainingId, trainingTitle, trainingDescription, trainingDurationHours) VALUES (:trainId, :title, :desc, :duration) ON DUPLICATE KEY UPDATE trainingTitle=VALUES(trainingTitle), trainingDescription=VALUES(trainingDescription), trainingDurationHours=VALUES(trainingDurationHours)');
        $stmtAppTrain = $db->prepare('INSERT INTO ApplicantTraining (applicantId, trainingId, completionDate, trainingInstructor) VALUES (:applicantId, :trainId, :completionDate, :instructor) ON DUPLICATE KEY UPDATE completionDate=VALUES(completionDate), trainingInstructor=VALUES(trainingInstructor)');

        foreach ($input['trainings'] as $train) {
            if (empty($train['completionDate'])) {
                jsonResponse(422, ['success' => false, 'message' => 'Each training requires a completionDate.']);
            }

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
                // Insert without explicit ID and capture auto-increment id
                $stmtTrain = $db->prepare('INSERT INTO Training (trainingTitle, trainingDescription, trainingDurationHours) VALUES (:title, :desc, :duration)');
                $stmtTrain->execute([
                    'title' => $trainTitle,
                    'desc' => $train['trainingDescription'] ?? '',
                    'duration' => $train['trainingDurationHours'] ?? 0
                ]);
                $trainId = $db->lastInsertId();
            } else {
                $stmtTrainUpdate = $db->prepare('UPDATE Training SET trainingTitle = :title, trainingDescription = :desc, trainingDurationHours = :duration WHERE trainingId = :trainId');
                $stmtTrainUpdate->execute([
                    'trainId' => $trainId,
                    'title' => $trainTitle,
                    'desc' => $train['trainingDescription'] ?? '',
                    'duration' => $train['trainingDurationHours'] ?? 0
                ]);
            }

            $stmtAppTrain->execute([
                'applicantId' => $applicantId,
                'trainId' => $trainId,
                'completionDate' => $train['completionDate'],
                'instructor' => $train['trainingInstructor'] ?? null
            ]);
        }
    }

    // --- References: associate references with applicantId (upsert) ---
    $returnedReferences = [];
    if (isset($input['references']) && is_array($input['references'])) {
        $stmtUpsertRef = $db->prepare('INSERT INTO Reference (JobApplicationId, referenceName, referenceTitle, referenceCompany, referencePhone, referenceEmail) VALUES (:jobApplicationId, :referenceName, :referenceTitle, :referenceCompany, :referencePhone, :referenceEmail) ON DUPLICATE KEY UPDATE referenceName = VALUES(referenceName), referenceTitle = VALUES(referenceTitle), referenceCompany = VALUES(referenceCompany), referencePhone = VALUES(referencePhone)');
        $stmtSelectRefByEmail = $db->prepare('SELECT referenceId FROM Reference WHERE referenceEmail = :referenceEmail LIMIT 1');
        $stmtSelectRefByEmailAndJob = $db->prepare('SELECT referenceId FROM Reference WHERE JobApplicationId = :jobApplicationId AND referenceEmail = :referenceEmail LIMIT 1');

        foreach ($input['references'] as $ref) {
            $email = !empty($ref['referenceEmail']) ? $ref['referenceEmail'] : null;
            $stmtUpsertRef->execute([
                'jobApplicationId' => $jobApplicationId,
                'referenceName' => $ref['referenceName'] ?? '',
                'referenceTitle' => $ref['referenceTitle'] ?? '',
                'referenceCompany' => $ref['referenceCompany'] ?? '',
                'referencePhone' => $ref['referencePhone'] ?? '',
                'referenceEmail' => $email
            ]);

            $lastId = $db->lastInsertId();
            if ($lastId && $lastId !== '0') {
                $returnedReferences[] = ['referenceId' => $lastId, 'referenceEmail' => $email];
            } else {
                if ($email !== null) {
                    $stmtSelectRefByEmailAndJob->execute(['jobApplicationId' => $jobApplicationId, 'referenceEmail' => $email]);
                    $found = $stmtSelectRefByEmailAndJob->fetch(PDO::FETCH_ASSOC);
                    if (!$found) {
                        $stmtSelectRefByEmail->execute(['referenceEmail' => $email]);
                        $found = $stmtSelectRefByEmail->fetch(PDO::FETCH_ASSOC);
                    }
                    if ($found && !empty($found['referenceId'])) {
                        $returnedReferences[] = ['referenceId' => $found['referenceId'], 'referenceEmail' => $email];
                    }
                }
            }
        }
    }

    $db->commit();

    jsonResponse(201, [
        'success' => true,
        'data' => [
            'jobApplicationId' => $jobApplicationId,
            'referenceIds' => $returnedReferences,
        ],
    ]);
} catch (Throwable $error) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    jsonResponse(500, [
        'success' => false,
        'message' => 'Application could not be created.',
    ]);
}
