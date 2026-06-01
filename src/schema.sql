--
-- Table structure for table `Applicant`
--
DROP TABLE IF EXISTS `Applicant`;
CREATE TABLE `Applicant` (
  `applicantId` int(10) NOT NULL AUTO_INCREMENT,
  `applicantName` varchar(80) NOT NULL,
  `homeAddress` varchar(100) NOT NULL,
  `phoneNumber` varchar(20) NOT NULL,
  `emailAddress` varchar(255) NOT NULL,
  `linkedInUrl` varchar(80) DEFAULT NULL,
  `citizenshipStatus` varchar(20) NOT NULL,
  `hasCriminalHistory` tinyint(1) NOT NULL,
  `passwordHash` varchar(255) NOT NULL,
  PRIMARY KEY (`applicantId`),
  UNIQUE KEY `emailAddress` (`emailAddress`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `Certificate`
--
DROP TABLE IF EXISTS `Certificate`;
CREATE TABLE `Certificate` (
  `certificateId` int(10) NOT NULL AUTO_INCREMENT,
  `certificateName` varchar(80) NOT NULL,
  `issuingAuthority` varchar(80) NOT NULL,
  `validityMonths` int(2) NOT NULL,
  PRIMARY KEY (`certificateId`),
  UNIQUE KEY `certificateName_authority` (`certificateName`,`issuingAuthority`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `ApplicantCertificate`
--
DROP TABLE IF EXISTS `ApplicantCertificate`;
CREATE TABLE `ApplicantCertificate` (
  `applicantId` int(10) NOT NULL,
  `certificateId` int(10) NOT NULL,
  `dateIssued` date NOT NULL,
  PRIMARY KEY (`applicantId`,`certificateId`),
  KEY `fk_ApplicantCertificate_1_idx` (`certificateId`),
  CONSTRAINT `fk_ApplicantCert_App` FOREIGN KEY (`applicantId`) REFERENCES `Applicant` (`applicantId`),
  CONSTRAINT `fk_ApplicantCert_Cert` FOREIGN KEY (`certificateId`) REFERENCES `Certificate` (`certificateId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `Training`
--
DROP TABLE IF EXISTS `Training`;
CREATE TABLE `Training` (
  `trainingId` int(10) NOT NULL AUTO_INCREMENT,
  `trainingTitle` varchar(80) NOT NULL,
  `trainingDescription` varchar(255) NOT NULL,
  `trainingDurationHours` int(3) NOT NULL,
  PRIMARY KEY (`trainingId`),
  UNIQUE KEY `trainingTitle` (`trainingTitle`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `ApplicantTraining`
--
DROP TABLE IF EXISTS `ApplicantTraining`;
CREATE TABLE `ApplicantTraining` (
  `applicantId` int(10) NOT NULL,
  `trainingId` int(10) NOT NULL,
  `completionDate` date NOT NULL,
  `trainingInstructor` varchar(80) DEFAULT NULL,
  PRIMARY KEY (`trainingId`,`applicantId`),
  KEY `fk_ApplicantTraining_2_idx` (`trainingId`),
  KEY `fk_ApplicantTraining_1_idx` (`applicantId`),
  CONSTRAINT `fk_ApplicantTrain_App` FOREIGN KEY (`applicantId`) REFERENCES `Applicant` (`applicantId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_ApplicantTrain_Train` FOREIGN KEY (`trainingId`) REFERENCES `Training` (`trainingId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `School`
--
DROP TABLE IF EXISTS `School`;
CREATE TABLE `School` (
  `schoolId` int(10) NOT NULL AUTO_INCREMENT,
  `schoolName` varchar(80) NOT NULL,
  `schoolLocation` varchar(100) NOT NULL,
  PRIMARY KEY (`schoolId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `Education`
--
DROP TABLE IF EXISTS `Education`;
CREATE TABLE `Education` (
  `educationId` int(10) NOT NULL AUTO_INCREMENT,
  `applicantId` int(10) NOT NULL,
  `schoolId` int(10) NOT NULL,
  `startYear` year(4) DEFAULT NULL,
  `endYear` year(4) DEFAULT NULL,
  `degreeReceived` varchar(30) NOT NULL,
  `programName` varchar(30) NOT NULL,
  PRIMARY KEY (`educationId`),
  KEY `applicantId` (`applicantId`),
  KEY `schoolId` (`schoolId`),
  CONSTRAINT `fk_Education_App` FOREIGN KEY (`applicantId`) REFERENCES `Applicant` (`applicantId`),
  CONSTRAINT `fk_Education_School` FOREIGN KEY (`schoolId`) REFERENCES `School` (`schoolId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `Company`
--
DROP TABLE IF EXISTS `Company`;
CREATE TABLE `Company` (
  `companyId` int(10) NOT NULL AUTO_INCREMENT,
  `companyName` varchar(80) NOT NULL,
  `companyAddress` varchar(100) NOT NULL,
  `companyPhone` varchar(16) NOT NULL,
  PRIMARY KEY (`companyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `EmploymentHistory`
--
DROP TABLE IF EXISTS `EmploymentHistory`;
CREATE TABLE `EmploymentHistory` (
  `EmploymentHistoryId` int(10) NOT NULL AUTO_INCREMENT,
  `applicantId` int(10) NOT NULL,
  `companyId` int(10) NOT NULL,
  `workPosition` varchar(80) NOT NULL,
  `reasonForLeaving` varchar(80) DEFAULT NULL,
  `startDate` date DEFAULT NULL,
  `endDate` date DEFAULT NULL,
  `isEmployed` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`EmploymentHistoryId`),
  KEY `applicantId` (`applicantId`),
  KEY `companyId` (`companyId`),
  CONSTRAINT `fk_EmpHistory_App` FOREIGN KEY (`applicantId`) REFERENCES `Applicant` (`applicantId`),
  CONSTRAINT `fk_EmpHistory_Company` FOREIGN KEY (`companyId`) REFERENCES `Company` (`companyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `JobApplication` (Uses UUID!)
--
DROP TABLE IF EXISTS `JobApplication`;
CREATE TABLE `JobApplication` (
  `JobApplicationId` char(36) NOT NULL,  -- Kept as UUID
  `applicantId` int(10) NOT NULL,           -- Changed to INT to match Applicant table
  `appliedPosition` varchar(60) NOT NULL,
  `JobApplicationDate` date NOT NULL,
  `JobApplicationStatus` varchar(20) NOT NULL DEFAULT 'Pending',
  `availableStartDate` date DEFAULT NULL,
  `expectedSalary` decimal(10,2) DEFAULT NULL,
  `resumeFileUrl` varchar(255) DEFAULT NULL,
  `agreesToDrugTest` tinyint(1) NOT NULL DEFAULT 0,
  `agreedToTerms` tinyint(1) NOT NULL DEFAULT 1,
  `dateAgreed` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`JobApplicationId`),
  KEY `applicantId` (`applicantId`),
  CONSTRAINT `fk_JobApp_Applicant` FOREIGN KEY (`applicantId`) REFERENCES `Applicant` (`applicantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `ApplicationResumeSettings`
--
DROP TABLE IF EXISTS `ApplicationResumeSettings`;
CREATE TABLE `ApplicationResumeSettings` (
  `JobApplicationId` char(36) NOT NULL,  -- Matches UUID of JobApplication
  `resumeTemplate` varchar(20) NOT NULL DEFAULT 'classic' CHECK (`resumeTemplate` in ('classic','compact','modern')),
  `previewFont` varchar(50) NOT NULL DEFAULT 'Times New Roman',
  `lastUpdated` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`JobApplicationId`),
  CONSTRAINT `fk_ResumeSet_JobApp` FOREIGN KEY (`JobApplicationId`) REFERENCES `JobApplication` (`JobApplicationId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `Reference`
--
DROP TABLE IF EXISTS `Reference`;
CREATE TABLE `Reference` (
  `referenceId` int(10) NOT NULL AUTO_INCREMENT,
  `JobApplicationId` char(36) NOT NULL,   -- Matches UUID of JobApplication
  `referenceName` varchar(80) NOT NULL,
  `referenceTitle` varchar(80) NOT NULL,
  `referenceCompany` varchar(80) NOT NULL,
  `referencePhone` varchar(20) NOT NULL,
  `referenceEmail` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`referenceId`),
  -- Make referenceEmail nullable and constrain uniqueness per JobApplication only.
  -- This allows multiple applications to reference the same email and allows
  -- empty/NULL emails without causing global conflicts.
  UNIQUE KEY `jobApp_referenceEmail` (`JobApplicationId`,`referenceEmail`),
  KEY `JobApplicationId` (`JobApplicationId`),
  CONSTRAINT `fk_Ref_JobApp` FOREIGN KEY (`JobApplicationId`) REFERENCES `JobApplication` (`JobApplicationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;