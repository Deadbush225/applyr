
SELECT ac.applicantId, ac.certificateId, ac.dateIssued
FROM ApplicantCertificate ac
WHERE ac.applicantId = :applicantId
ORDER BY ac.dateIssued DESC;


2. Problem: Get all trainings completed by one applicant.

SELECT at.applicantId, at.trainingId, at.completionDate, at.trainingInstructor
FROM ApplicantTraining at
WHERE at.applicantId = :applicantId
ORDER BY at.completionDate DESC;


3. Problem: List all pending job applications.

SELECT JobApplicationId, applicantId, appliedPosition, JobApplicationDate, JobApplicationStatus
FROM JobApplication
WHERE JobApplicationStatus = 'Pending'
ORDER BY JobApplicationDate DESC;


4. Problem: Find applicants with criminal history = true.

SELECT applicantId, applicantName, emailAddress, phoneNumber
FROM Applicant
WHERE hasCriminalHistory = 1
ORDER BY applicantName;


5. Problem: Get job applications with expected salary greater than a threshold.

SELECT JobApplicationId, applicantId, appliedPosition, expectedSalary
FROM JobApplication
WHERE expectedSalary > :minSalary
ORDER BY expectedSalary DESC;


**5 Advanced SQL Statements (GROUP BY + HAVING)**
6. Problem: Find applicants who have at least 2 certificates.

SELECT ac.applicantId, COUNT(*) AS certificateCount
FROM ApplicantCertificate ac
GROUP BY ac.applicantId
HAVING COUNT(*) >= 2
ORDER BY certificateCount DESC;


7. Problem: Find applicants who completed at least 3 trainings.

SELECT at.applicantId, COUNT(*) AS trainingCount
FROM ApplicantTraining at
GROUP BY at.applicantId
HAVING COUNT(*) >= 3
ORDER BY trainingCount DESC;


8. Problem: Find applied positions with more than 5 applications.

SELECT appliedPosition, COUNT(*) AS totalApplications
FROM JobApplication
GROUP BY appliedPosition
HAVING COUNT(*) > 5
ORDER BY totalApplications DESC;


9. Problem: Count applications per status, but only show statuses with at least 2 rows.

SELECT JobApplicationStatus, COUNT(*) AS statusCount
FROM JobApplication
GROUP BY JobApplicationStatus
HAVING COUNT(*) >= 2
ORDER BY statusCount DESC;


10. Problem: Find applicants whose average expected salary is above a value.

SELECT applicantId, AVG(expectedSalary) AS avgExpectedSalary
FROM JobApplication
WHERE expectedSalary IS NOT NULL
GROUP BY applicantId
HAVING AVG(expectedSalary) > :salaryThreshold
ORDER BY avgExpectedSalary DESC;


---

Problem: For a specific applicant, show certificate details with expiry analytics — compute expiry date, days until expiry, urgency bucket, and set a renewal status.
ALTER TABLE ApplicantCertificate
ADD COLUMN renewalStatus ENUM('Pending','Renewed','Expired') NOT NULL DEFAULT 'Pending';
UPDATE ApplicantCertificate ac
JOIN Certificate c ON ac.certificateId = c.certificateId
SET ac.renewalStatus = CASE
WHEN DATE_ADD(ac.dateIssued, INTERVAL c.validityMonths MONTH) < CURRENT_DATE THEN 'Expired'
ELSE 'Pending'
END;

SELECT
ac.applicantId,
ac.certificateId,
c.certificateName,
c.issuingAuthority,
ac.dateIssued,
DATE_ADD(ac.dateIssued, INTERVAL c.validityMonths MONTH) AS expiryDate,
DATEDIFF(DATE_ADD(ac.dateIssued, INTERVAL c.validityMonths MONTH), CURRENT_DATE) AS daysUntilExpiry,
CASE
WHEN DATEDIFF(DATE_ADD(ac.dateIssued, INTERVAL c.validityMonths MONTH), CURRENT_DATE) < 0 THEN 'Expired'
WHEN DATEDIFF(DATE_ADD(ac.dateIssued, INTERVAL c.validityMonths MONTH), CURRENT_DATE) <= 30 THEN 'Urgent'
WHEN DATEDIFF(DATE_ADD(ac.dateIssued, INTERVAL c.validityMonths MONTH), CURRENT_DATE) <= 90 THEN 'Warning'
ELSE 'Valid'
END AS expiryStatus,
ac.renewalStatus
FROM ApplicantCertificate ac
JOIN Certificate c ON ac.certificateId = c.certificateId
WHERE ac.applicantId = :applicantId
ORDER BY expiryDate ASC, ac.dateIssued DESC;

Problem: For a specific applicant, show training progression analytics — cumulative training hours and days since previous training.
ALTER TABLE ApplicantTraining
ADD COLUMN completionStatus ENUM('Completed','Incomplete') NOT NULL DEFAULT 'Completed';
UPDATE ApplicantTraining
SET completionStatus = IF(completionDate IS NULL, 'Incomplete', 'Completed');

SELECT
at.applicantId,
at.trainingId,
t.trainingTitle,
t.trainingDurationHours,
at.trainingInstructor,
at.completionDate,
(
SELECT COALESCE(SUM(t2.trainingDurationHours), 0)
FROM ApplicantTraining at2
JOIN Training t2 ON at2.trainingId = t2.trainingId
WHERE at2.applicantId = at.applicantId
AND at2.completionDate IS NOT NULL
AND at2.completionDate <= at.completionDate
) AS cumulativeHours,
DATEDIFF(
at.completionDate,
(
SELECT MAX(at_prev.completionDate)
FROM ApplicantTraining at_prev
WHERE at_prev.applicantId = at.applicantId
AND at_prev.completionDate < at.completionDate
)
) AS daysSincePreviousTraining,
at.completionStatus
FROM ApplicantTraining at
JOIN Training t ON at.trainingId = t.trainingId
WHERE at.applicantId = :applicantId
ORDER BY at.completionDate DESC, at.trainingId DESC;

Problem: List job applications (for one applicant) with reference count, settings completeness, a priority tag, and a stale-record flag.
ALTER TABLE JobApplication
ADD COLUMN priorityTag VARCHAR(32) NOT NULL DEFAULT 'normal';
UPDATE JobApplication
SET priorityTag = 'high'
WHERE expectedSalary IS NOT NULL AND expectedSalary > :highSalary;

SELECT
ja.JobApplicationId,
ja.applicantId,
a.applicantName,
ja.appliedPosition,
ja.JobApplicationDate,
ja.JobApplicationStatus,
ja.expectedSalary,
(
SELECT COUNT(*) FROM Reference r WHERE r.JobApplicationId = ja.JobApplicationId
) AS referenceCount,
CASE
WHEN EXISTS (
SELECT 1 FROM ApplicationResumeSettings ars
WHERE ars.JobApplicationId = ja.JobApplicationId
AND ars.resumeTemplate IS NOT NULL
AND ars.previewFont IS NOT NULL
) THEN 'Complete Settings'
ELSE 'Missing Settings'
END AS settingsStatus,
ja.priorityTag,
CASE WHEN ja.lastUpdated < (NOW() - INTERVAL 30 DAY) THEN 1 ELSE 0 END AS isStale
FROM JobApplication ja
JOIN Applicant a ON a.applicantId = ja.applicantId
WHERE ja.applicantId = :applicantId
ORDER BY ja.lastUpdated DESC, ja.JobApplicationDate DESC;

Problem: For one applicant, show education timeline quality checks — normalized end year, gap from previous, and overlap/large-gap flags.
ALTER TABLE School
ADD COLUMN schoolType VARCHAR(32) NOT NULL DEFAULT 'Other';
UPDATE School
SET schoolType = CASE
WHEN schoolName LIKE '%University%' THEN 'University'
WHEN schoolName LIKE '%College%' THEN 'College'
ELSE 'Other'
END;

SELECT
e.educationId,
e.applicantId,
s.schoolName,
s.schoolType,
e.degreeReceived,
e.programName,
e.startYear,
e.endYear,
COALESCE(e.endYear, YEAR(CURRENT_DATE)) AS normalizedEndYear,
(
SELECT MAX(COALESCE(e2.endYear, YEAR(CURRENT_DATE)))
FROM Education e2
WHERE e2.applicantId = e.applicantId
AND e2.educationId <> e.educationId
AND (e2.startYear < e.startYear OR (e2.startYear = e.startYear AND e2.educationId < e.educationId))
) AS prevNormalizedEndYear,
CASE
WHEN (
SELECT MAX(COALESCE(e2.endYear, YEAR(CURRENT_DATE)))
FROM Education e2
WHERE e2.applicantId = e.applicantId
AND e2.educationId <> e.educationId
AND (e2.startYear < e.startYear OR (e2.startYear = e.startYear AND e2.educationId < e.educationId))
) IS NULL THEN NULL
ELSE e.startYear - (
SELECT MAX(COALESCE(e2.endYear, YEAR(CURRENT_DATE)))
FROM Education e2
WHERE e2.applicantId = e.applicantId
AND e2.educationId <> e.educationId
AND (e2.startYear < e.startYear OR (e2.startYear = e.startYear AND e2.educationId < e.educationId))
)
END AS gapYearsFromPrevious,
CASE
WHEN (
SELECT MAX(COALESCE(e2.endYear, YEAR(CURRENT_DATE)))
FROM Education e2
WHERE e2.applicantId = e.applicantId
AND e2.educationId <> e.educationId
AND (e2.startYear < e.startYear OR (e2.startYear = e.startYear AND e2.educationId < e.educationId))
) IS NULL THEN 'Normal'
WHEN e.startYear < (
SELECT MAX(COALESCE(e2.endYear, YEAR(CURRENT_DATE)))
FROM Education e2
WHERE e2.applicantId = e.applicantId
AND e2.educationId <> e.educationId
AND (e2.startYear < e.startYear OR (e2.startYear = e.startYear AND e2.educationId < e.educationId))
) THEN 'Overlap'
WHEN e.startYear - (
SELECT MAX(COALESCE(e2.endYear, YEAR(CURRENT_DATE)))
FROM Education e2
WHERE e2.applicantId = e.applicantId
AND e2.educationId <> e.educationId
AND (e2.startYear < e.startYear OR (e2.startYear = e.startYear AND e2.educationId < e.educationId))
) > 2 THEN 'Large Gap'
ELSE 'Normal'
END AS timelineFlag
FROM Education e
JOIN School s ON s.schoolId = e.schoolId
WHERE e.applicantId = :applicantId
ORDER BY e.startYear DESC, e.educationId DESC;

Problem: For one applicant, show employment history with tenure analytics and overlap detection.
ALTER TABLE EmploymentHistory
ADD COLUMN employmentStatus ENUM('Current','Ended') NOT NULL DEFAULT 'Ended';
UPDATE EmploymentHistory
SET employmentStatus = IF(isEmployed = 1, 'Current', 'Ended');

SELECT
eh.EmploymentHistoryId,
eh.applicantId,
c.companyName,
eh.workPosition,
eh.reasonForLeaving,
eh.startDate,
eh.endDate,
eh.isEmployed,
COALESCE(eh.endDate, CURRENT_DATE) AS normalizedEndDate,
TIMESTAMPDIFF(MONTH, eh.startDate, COALESCE(eh.endDate, CURRENT_DATE)) AS tenureMonths,
eh.employmentStatus AS employmentState,
CASE
WHEN EXISTS (
SELECT 1
FROM EmploymentHistory x
WHERE x.applicantId = eh.applicantId
AND x.EmploymentHistoryId <> eh.EmploymentHistoryId
AND x.startDate <= COALESCE(eh.endDate, CURRENT_DATE)
AND COALESCE(x.endDate, CURRENT_DATE) >= eh.startDate
) THEN 1
ELSE 0
END AS hasDateOverlap
FROM EmploymentHistory eh
JOIN Company c ON c.companyId = eh.companyId
WHERE eh.applicantId = :applicantId
ORDER BY eh.startDate DESC, eh.EmploymentHistoryId DESC;

