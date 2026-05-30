
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


### Moderate (Using `GROUP BY` and `HAVING`)

**1. Display the applied position and the total count of applications received for each position. Include only those positions that have received more than 5 applications. Provide appropriate headers.**


SELECT 
    appliedPosition AS 'Position', 
    COUNT(JobApplicationId) AS 'Total Applications'
FROM JobApplication
GROUP BY appliedPosition
HAVING COUNT(JobApplicationId) > 5;



**2. Display the job application status and the average expected salary for each status. Only display statuses where the average expected salary is greater than $50,000. Provide appropriate headers.**


SELECT 
    JobApplicationStatus AS 'Status', 
    AVG(expectedSalary) AS 'Average Expected Salary'
FROM JobApplication
GROUP BY JobApplicationStatus
HAVING AVG(expectedSalary) > 50000;



**3. Display the applicant ID and the total number of certificates they hold. Include only applicants who have earned more than 2 certificates. Provide appropriate headers.**


SELECT 
    applicantId AS 'Applicant ID', 
    COUNT(certificateId) AS 'Total Certificates'
FROM ApplicantCertificate
GROUP BY applicantId
HAVING COUNT(certificateId) > 2;



**4. Display the applicant ID and the total training duration hours they have completed. Only show applicants who have accumulated more than 40 hours of training. Provide appropriate headers.**


SELECT 
    a.applicantId AS 'Applicant ID', 
    SUM(t.trainingDurationHours) AS 'Total Training Hours'
FROM ApplicantTraining a
JOIN Training t ON a.trainingId = t.trainingId
GROUP BY a.applicantId
HAVING SUM(t.trainingDurationHours) > 40;



**5. Display the company ID and the count of unique applicants who have worked there. Include only companies that appear in the employment history of 3 or more applicants. Provide appropriate headers.**


SELECT 
    companyId AS 'Company ID', 
    COUNT(DISTINCT applicantId) AS 'Number of Applicants'
FROM EmploymentHistory
GROUP BY companyId
HAVING COUNT(DISTINCT applicantId) >= 3;



---

### Difficult (Multi-table Joins and Complexity)

**6. Display the applicant name, citizenship status, degree received, program name, and the school name. Display only those who are currently employed. Sort the results alphabetically by the applicants name. Provide appropriate headers.**


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



**7. Display the applicant name, applied position, their most recent work position, and the company name of that latest job. Include only job applications currently marked as 'Pending'. Provide appropriate headers.**


SELECT 
    a.applicantName AS 'Applicant Name', 
    ja.appliedPosition AS 'Position Applied', 
    eh.workPosition AS 'Recent Position', 
    c.companyName AS 'Company Name'
FROM JobApplication ja
JOIN Applicant a ON ja.applicantId = a.applicantId
JOIN EmploymentHistory eh ON a.applicantId = eh.applicantId
JOIN Company c ON eh.companyId = c.companyId
WHERE ja.JobApplicationStatus = 'Pending'
  AND eh.endDate = (
      SELECT MAX(endDate) 
      FROM EmploymentHistory 
      WHERE applicantId = a.applicantId
  );



**8. Display the applicant name, email address, and applied position for applicants applying for a 'Manager' position (where the position name contains 'Manager') who have either no listed education records or no listed employment history. Provide appropriate headers.**


SELECT 
    a.applicantName AS 'Applicant Name', 
    a.emailAddress AS 'Email', 
    ja.appliedPosition AS 'Position'
FROM JobApplication ja
JOIN Applicant a ON ja.applicantId = a.applicantId
LEFT JOIN Education e ON a.applicantId = e.applicantId
LEFT JOIN EmploymentHistory eh ON a.applicantId = eh.applicantId
WHERE ja.appliedPosition LIKE '%Manager%'
  AND (e.educationId IS NULL OR eh.EmploymentHistoryId IS NULL);



**9. Display the applicant name, the total number of certificates they hold, the total number of training sessions completed, and the total number of employment history records they have. Sort the results from the applicant with the most total combined records to the least. Provide appropriate headers.**


SELECT 
    a.applicantName AS 'Applicant Name',
    (SELECT COUNT(*) FROM ApplicantCertificate WHERE applicantId = a.applicantId) AS 'Total Certificates',
    (SELECT COUNT(*) FROM ApplicantTraining WHERE applicantId = a.applicantId) AS 'Total Trainings',
    (SELECT COUNT(*) FROM EmploymentHistory WHERE applicantId = a.applicantId) AS 'Total Employments'
FROM Applicant a
ORDER BY ('Total Certificates' + 'Total Trainings' + 'Total Employments') DESC;



**10. Display the applicant name, applied position, and a comma-separated list of their reference names. Include only applicants who have provided at least 3 references for their application and who agreed to a drug test. Provide appropriate headers.**


SELECT 
    a.applicantName AS 'Applicant Name', 
    ja.appliedPosition AS 'Position', 
    GROUP_CONCAT(r.referenceName SEPARATOR ', ') AS 'References'
FROM JobApplication ja
JOIN Applicant a ON ja.applicantId = a.applicantId
JOIN Reference r ON ja.JobApplicationId = r.JobApplicationId
WHERE ja.agreesToDrugTest = 1
GROUP BY ja.JobApplicationId, a.applicantName, ja.appliedPosition
HAVING COUNT(r.referenceId) >= 3;

