/* ━━━━━━━━━━━━━━━━━━━━━━━━ 3 Basic Statements ━━━━━━━━━━━━━━━━━━━━━━━ */
-- 1. To ensure compliance with specific job requirements, HR needs to audit 
--    the certifications of specific candidates. Retrieve the applicant ID, 
--    applicant name, certificate ID, certificate name, and the date issued
--    for applicant number 10. Order the results by the most recently issued 
--    certificate.

SELECT 
    ac.applicantId, 
    a.applicantName,
    ac.certificateId, 
    ce.certificateName,
    ac.dateIssued
FROM ApplicantCertificate ac 
JOIN Certificate ce ON ac.certificateId = ce.certificateId 
JOIN Applicant a ON ac.applicantId = a.applicantId
WHERE ac.applicantId = 10 
ORDER BY ac.dateIssued DESC;

-- 2. Recruiters need a daily pipeline report to prioritize their screening calls. 
--    List the Job Application ID, Applicant ID, the position applied for, and
--    the application date for all applications currently in 'Pending' status. 
--    Sort from the newest applications to the oldest.

SELECT 
    JobApplicationId, 
    applicantId, 
    appliedPosition, 
    JobApplicationDate, 
    JobApplicationStatus
FROM JobApplication
WHERE JobApplicationStatus = 'Pending'
ORDER BY JobApplicationDate DESC;

-- 3. The finance team is forecasting the budget for upcoming hires and needs 
--    to flag applications with high salary expectations. Retrieve the Job 
--    Application ID, Applicant ID, applied position, and expected salary for 
--    applications demanding more than Php 50,000. Sort the results from highest
--    expected salary to lowest.

SELECT 
    JobApplicationId, 
    applicantId, 
    appliedPosition, 
    expectedSalary
FROM JobApplication
WHERE expectedSalary > 50000 
ORDER BY expectedSalary DESC;

/* ━━━━━━━━━━━━━━━━━━━━━━━━ 4 Moderate Statements ━━━━━━━━━━━━━━━━━━━━━━━ */
-- 4. Talent acquisition wants to analyze which job postings are attracting 
--    the most interest to adjust their marketing spend. Display the applied
--    position and the total count of applications received. Include only roles
--    that have generated more than 5 applications. Provide appropriate headers.

SELECT
   appliedPosition AS 'Position',
   COUNT(JobApplicationId) AS 'Total Applications'
FROM JobApplication
GROUP BY appliedPosition
HAVING COUNT(JobApplicationId) > 5;

-- 5. HR analytics is trying to determine if candidates who progress further
--    in the pipeline ask for higher compensation. Display the job application
--    status and the average expected salary for that status. Filter to show only
--    statuses where the average expected salary exceeds Php 50,000.
--    Provide appropriate headers.

SELECT
   JobApplicationStatus AS 'Status',
   AVG(expectedSalary) AS 'Average Expected Salary'
FROM JobApplication
GROUP BY JobApplicationStatus
HAVING AVG(expectedSalary) > 50000;

-- 6. To find candidates dedicated to continuous learning, calculate the total 
--    training hours accumulated by each applicant. Display the Applicant Name, 
--    their total training hours, and a comma-separated list of the trainingIds 
--    they completed. Only include applicants with more than 40 hours of training. 
--    Sorted from largest training durations. Provide appropriate headers.

SELECT
   a.applicantName AS 'Applicant Name',
   SUM(t.trainingDurationHours) AS 'Total Training Hours',
   GROUP_CONCAT(t.trainingTitle SEPARATOR ', ') AS 'Completed Trainings'
FROM ApplicantTraining atr
	JOIN Training t ON atr.trainingId = t.trainingId
  JOIN Applicant a ON atr.applicantId = a.applicantId
GROUP BY atr.applicantId
HAVING SUM(t.trainingDurationHours) > 40
ORDER BY SUM(t.trainingDurationHours) DESC;

-- 7. Discover which previous employers act as the biggest talent pipelines for 
--    your company. Display the Company ID, the total number of unique applicants 
--    who worked there, and a list of those Applicant IDs. Include only companies
--    that appear in the employment history of 3 or more distinct applicants. 
--    Provide appropriate headers.

SELECT
   c.companyName AS 'Company Name',
   COUNT(DISTINCT eh.applicantId) AS 'Number of Applicants',
   GROUP_CONCAT(DISTINCT a.applicantName SEPARATOR ', ') AS 'Applicant Name'
FROM EmploymentHistory eh
	JOIN Company c ON c.companyId = eh.companyId
  JOIN Applicant a ON a.applicantId = eh.applicantId
GROUP BY c.companyId
HAVING COUNT(*) >= 3;

/* ━━━━━━━━━━━━━━━━━━━━━━━ 3 Difficult Statements ━━━━━━━━━━━━━━━━━━━━━━━ */
-- 8. The background check team needs to verify the education of "passive candidates" 
--    (those who are currently employed elsewhere). Display the Applicant ID,
--    applicant name, citizenship status, degree received, program name, School ID, 
--    and school name. Filter for currently employed candidates and sort 
--    alphabetically by the applicants name. Provide appropriate headers.

SELECT
   a.applicantName AS 'Applicant Name',
   a.citizenshipStatus AS 'Citizenship',
   e.degreeReceived AS 'Degree',
   e.programName AS 'Program',
   s.schoolName AS 'School Name'
FROM Applicant a
JOIN Education e ON a.applicantId = e.applicantId
JOIN School s ON e.schoolId = s.schoolId
JOIN EmploymentHistory eh ON a.applicantId = eh.applicantId
WHERE eh.isEmployed = 1
ORDER BY a.applicantName;

-- 9. Recruiters want to prioritize candidates with well-documented histories. 
--    Generate a "Profile Completeness" report by displaying the Applicant ID, 
--    applicant name, total certificates held, total training sessions completed, 
--    and total employment history records. Sort the output from the candidate 
--    with the highest combined total of records to the lowest. Provide appropriate headers.

SELECT
   a.applicantName AS 'Applicant Name',
   (SELECT COUNT(*) FROM ApplicantCertificate WHERE applicantId = a.applicantId) AS 'Total Certificates',
   (SELECT COUNT(*) FROM ApplicantTraining WHERE applicantId = a.applicantId) AS 'Total Trainings',
   (SELECT COUNT(*) FROM EmploymentHistory WHERE applicantId = a.applicantId) AS 'Total Employments'
FROM Applicant a
ORDER BY (`Total Certificates` + `Total Trainings` + `Total Employments`) DESC;

-- 10. For applicants moving to the final background screening phase, the
--     automated email system needs a structured list of reference emails to send 
--     out surveys. Display the Job Application ID, applicant name, applied position, 
--     a comma-separated list of Reference Emails, and Reference Names. 
--     Include only applicants who agreed to a drug test and provided at least 2 references. 
--     Provide appropriate headers.

SELECT
   ja.JobApplicationId AS 'Job Application ID',
   a.applicantName AS 'Applicant Name',
   ja.appliedPosition AS 'Position',
   GROUP_CONCAT(r.referenceName SEPARATOR ', ') AS 'Reference Names',
   GROUP_CONCAT(r.referenceEmail SEPARATOR ', ') AS 'Reference Emails'
FROM JobApplication ja
JOIN Applicant a ON ja.applicantId = a.applicantId
JOIN Reference r ON ja.JobApplicationId = r.JobApplicationId
WHERE ja.agreesToDrugTest = 1
GROUP BY ja.JobApplicationId, a.applicantId, a.applicantName, ja.appliedPosition
HAVING COUNT(r.referenceId) >= 2;
