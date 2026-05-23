-- 1. Create Independent Entities First

CREATE TABLE Applicant (
    applicantId INT(10) PRIMARY KEY NOT NULL,
    applicantName VARCHAR(80) NOT NULL,
    homeAddress VARCHAR(100) NOT NULL,
    phoneNumber VARCHAR(11) NOT NULL,
    emailAddress VARCHAR(255) UNIQUE NOT NULL,
    linkedInUrl VARCHAR(80),
    citizenshipStatus VARCHAR(20) NOT NULL CHECK (citizenshipStatus IN ('Citizen', 'Permanent Resident', 'Visa', 'Other')),
    hasCriminalHistory BOOLEAN NOT NULL
);

CREATE TABLE Company (
    companyId INT(10) PRIMARY KEY NOT NULL,
    companyName VARCHAR(80) NOT NULL,
    companyAddress VARCHAR(100) NOT NULL,
    companyPhone VARCHAR(16) NOT NULL
);

CREATE TABLE School (
    schoolId INT(10) PRIMARY KEY NOT NULL,
    schoolName VARCHAR(80) NOT NULL,
    schoolLocation VARCHAR(100) NOT NULL
);

CREATE TABLE Certificate (
    certificateId INT(10) PRIMARY KEY NOT NULL,
    certificateName VARCHAR(80) NOT NULL,
    issuingAuthority VARCHAR(80) NOT NULL,
    validityMonths INT(2) NOT NULL
);

CREATE TABLE Training (
    trainingId INT(10) PRIMARY KEY NOT NULL,
    trainingTitle VARCHAR(80) NOT NULL,
    trainingDescription VARCHAR(255) NOT NULL,
    trainingInstructor VARCHAR(80) NOT NULL,
    trainingDurationHours INT(3) NOT NULL
);

-- 2. Create Dependent Entities (Foreign Keys referencing Independent Entities)

CREATE TABLE ApplicationResumeSettings (
    JobApplicationId INT(10) PRIMARY KEY,
    resumeTemplate VARCHAR(20) NOT NULL DEFAULT 'classic' CHECK (resumeTemplate IN ('classic', 'compact', 'modern')),
    previewFont VARCHAR(50) NOT NULL DEFAULT 'Helvetica',
    lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (JobApplicationId) REFERENCES JobApplication(JobApplicationId) ON DELETE CASCADE
);

CREATE TABLE JobApplication (
    JobApplicationId INT(10) PRIMARY KEY NOT NULL,
    applicantId INT(10) NOT NULL,
    appliedPosition VARCHAR(60) NOT NULL,
    JobApplicationDate DATE NOT NULL,
    JobApplicationStatus VARCHAR(20) NOT NULL CHECK (JobApplicationStatus IN ('Pending', 'Under Review', 'Interview', 'Offered', 'Rejected', 'Withdrawn')),
    availableStartDate DATE NOT NULL,
    expectedSalary DECIMAL(10,2) CHECK (expectedSalary >= 0.00),
    resumeFileUrl VARCHAR(60),
    agreesToDrugTest BOOLEAN NOT NULL,
    agreedToTerms BOOLEAN NOT NULL,
    dateAgreed DATE NOT NULL,
    FOREIGN KEY (applicantId) REFERENCES Applicant(applicantId)
);

CREATE TABLE EmploymentHistory (
    EmploymentHistoryId INT(10) PRIMARY KEY NOT NULL,
    applicantId INT(10) NOT NULL,
    companyId INT(10) NOT NULL,
    workPosition VARCHAR(80) NOT NULL,
    reasonForLeaving VARCHAR(80),
    startDate DATE NOT NULL,
    endDate DATE NOT NULL,
    isEmployed BOOLEAN NOT NULL,
    FOREIGN KEY (applicantId) REFERENCES Applicant(applicantId),
    FOREIGN KEY (companyId) REFERENCES Company(companyId)
);

CREATE TABLE Education (
    educationId INT(10) PRIMARY KEY NOT NULL,
    applicantId INT(10) NOT NULL,
    schoolId INT(10) NOT NULL,
    startYear YEAR NOT NULL,
    endYear YEAR NOT NULL,
    degreeReceived VARCHAR(30) NOT NULL,
    programName VARCHAR(30) NOT NULL,
    FOREIGN KEY (applicantId) REFERENCES Applicant(applicantId),
    FOREIGN KEY (schoolId) REFERENCES School(schoolId)
);

CREATE TABLE ApplicantCertificate (
    applicantId INT(10) NOT NULL,
    certificateId INT(10) NOT NULL,
    dateIssued DATE NOT NULL,
    PRIMARY KEY (applicantId, certificateId),
    FOREIGN KEY (applicantId) REFERENCES Applicant(applicantId),
    FOREIGN KEY (certificateId) REFERENCES Certificate(certificateId)
);

CREATE TABLE ApplicantTraining (
    applicantId INT(10) NOT NULL,
    trainingId INT(10) NOT NULL,
    completionDate DATE NOT NULL,
    PRIMARY KEY (applicantId, trainingId),
    FOREIGN KEY (applicantId) REFERENCES Applicant(applicantId),
    FOREIGN KEY (trainingId) REFERENCES Training(trainingId)
);

-- 3. Create Multi-level Dependent Entities

CREATE TABLE Reference (
    referenceId INT(10) PRIMARY KEY NOT NULL,
    JobApplicationId INT(10) NOT NULL,
    referenceName VARCHAR(80) NOT NULL,
    referenceTitle VARCHAR(80) NOT NULL,
    referenceCompany VARCHAR(80) NOT NULL,
    referencePhone VARCHAR(11) NOT NULL,
    referenceEmail VARCHAR(255) UNIQUE NOT NULL,
    FOREIGN KEY (JobApplicationId) REFERENCES JobApplication(JobApplicationId)
);