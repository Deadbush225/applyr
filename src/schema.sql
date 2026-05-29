/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- --------------------------------------------------------
-- Table structure for table `Applicant`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `Applicant`;
CREATE TABLE `Applicant` (
  `applicantId` char(36) NOT NULL,
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

-- --------------------------------------------------------
-- Table structure for table `Certificate`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `Certificate`;
CREATE TABLE `Certificate` (
  `certificateId` int(10) NOT NULL AUTO_INCREMENT,
  `certificateName` varchar(80) NOT NULL,
  `issuingAuthority` varchar(80) NOT NULL,
  `validityMonths` int(2) NOT NULL,
  PRIMARY KEY (`certificateId`),
  UNIQUE KEY `certificateName_authority` (`certificateName`,`issuingAuthority`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `Company`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `Company`;
CREATE TABLE `Company` (
  `companyId` int(10) NOT NULL AUTO_INCREMENT,
  `companyName` varchar(80) NOT NULL,
  `companyAddress` varchar(100) NOT NULL,
  `companyPhone` varchar(11) NOT NULL,
  PRIMARY KEY (`companyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `School`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `School`;
CREATE TABLE `School` (
  `schoolId` int(10) NOT NULL AUTO_INCREMENT,
  `schoolName` varchar(80) NOT NULL,
  `schoolLocation` varchar(100) NOT NULL,
  PRIMARY KEY (`schoolId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `Training`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `Training`;
CREATE TABLE `Training` (
  `trainingId` int(10) NOT NULL AUTO_INCREMENT,
  `trainingTitle` varchar(80) NOT NULL,
  `trainingDescription` varchar(255) NOT NULL,
  `trainingDurationHours` int(3) NOT NULL,
  PRIMARY KEY (`trainingId`),
  UNIQUE KEY `trainingTitle` (`trainingTitle`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `JobApplication`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `JobApplication`;
CREATE TABLE `JobApplication` (
  `JobApplicationId` char(36) NOT NULL,
  `applicantId` char(36) NOT NULL,
  `appliedPosition` varchar(60) NOT NULL,
  `JobApplicationDate` date NOT NULL,
  `JobApplicationStatus` varchar(20) NOT NULL DEFAULT 'Pending',
  `availableStartDate` date DEFAULT NULL,
  `expectedSalary` decimal(10,2) DEFAULT NULL,
  `agreesToDrugTest` tinyint(1) NOT NULL DEFAULT 0,
  `agreedToTerms` tinyint(1) NOT NULL DEFAULT 1,
  `dateAgreed` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `lastUpdated` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`JobApplicationId`),
  KEY `applicantId` (`applicantId`),
  CONSTRAINT `fk_jobapp_applicant` FOREIGN KEY (`applicantId`) REFERENCES `Applicant` (`applicantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `ApplicationResumeSettings`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `ApplicationResumeSettings`;
CREATE TABLE `ApplicationResumeSettings` (
  `JobApplicationId` char(36) NOT NULL,
  `resumeTemplate` varchar(20) NOT NULL DEFAULT 'classic' CHECK (`resumeTemplate` in ('classic','compact','modern')),
  `previewFont` varchar(50) NOT NULL DEFAULT 'Helvetica',
  `lastUpdated` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`JobApplicationId`),
  CONSTRAINT `fk_settings_jobapp` FOREIGN KEY (`JobApplicationId`) REFERENCES `JobApplication` (`JobApplicationId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `ApplicantCertificate`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `ApplicantCertificate`;
CREATE TABLE `ApplicantCertificate` (
  `applicantId` char(36) NOT NULL,
  `certificateId` char(36) NOT NULL,
  `dateIssued` date NOT NULL,
  PRIMARY KEY (`applicantId`,`certificateId`),
  KEY `fk_appcert_cert_idx` (`certificateId`),
  CONSTRAINT `fk_appcert_applicant` FOREIGN KEY (`applicantId`) REFERENCES `Applicant` (`applicantId`),
  CONSTRAINT `fk_appcert_cert` FOREIGN KEY (`certificateId`) REFERENCES `Certificate` (`certificateId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `ApplicantTraining`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `ApplicantTraining`;
CREATE TABLE `ApplicantTraining` (
  `applicantId` char(36) NOT NULL,
  `trainingId` char(36) NOT NULL,
  `completionDate` date NOT NULL,
  `trainingInstructor` varchar(80) DEFAULT NULL,
  PRIMARY KEY (`trainingId`,`applicantId`),
  KEY `fk_apptrain_applicant_idx` (`applicantId`),
  CONSTRAINT `fk_apptrain_applicant` FOREIGN KEY (`applicantId`) REFERENCES `Applicant` (`applicantId`),
  CONSTRAINT `fk_apptrain_train` FOREIGN KEY (`trainingId`) REFERENCES `Training` (`trainingId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `Education`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `Education`;
CREATE TABLE `Education` (
  `educationId` char(36) NOT NULL,
  `applicantId` char(36) NOT NULL,
  `schoolId` char(36) NOT NULL,
  `startYear` year(4) DEFAULT NULL,
  `endYear` year(4) DEFAULT NULL,
  `degreeReceived` varchar(30) NOT NULL,
  `programName` varchar(30) NOT NULL,
  PRIMARY KEY (`educationId`),
  KEY `applicantId` (`applicantId`),
  KEY `schoolId` (`schoolId`),
  CONSTRAINT `fk_edu_applicant` FOREIGN KEY (`applicantId`) REFERENCES `Applicant` (`applicantId`),
  CONSTRAINT `fk_edu_school` FOREIGN KEY (`schoolId`) REFERENCES `School` (`schoolId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `EmploymentHistory`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `EmploymentHistory`;
CREATE TABLE `EmploymentHistory` (
  `EmploymentHistoryId` char(36) NOT NULL,
  `applicantId` char(36) NOT NULL,
  `companyId` char(36) NOT NULL,
  `workPosition` varchar(80) NOT NULL,
  `reasonForLeaving` varchar(80) DEFAULT NULL,
  `startDate` date DEFAULT NULL,
  `endDate` date DEFAULT NULL,
  `isEmployed` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`EmploymentHistoryId`),
  KEY `applicantId` (`applicantId`),
  KEY `companyId` (`companyId`),
  CONSTRAINT `fk_emp_applicant` FOREIGN KEY (`applicantId`) REFERENCES `Applicant` (`applicantId`),
  CONSTRAINT `fk_emp_company` FOREIGN KEY (`companyId`) REFERENCES `Company` (`companyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `Reference`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `Reference`;
CREATE TABLE `Reference` (
  `referenceId` char(36) NOT NULL,
  `JobApplicationId` char(36) NOT NULL,
  `referenceName` varchar(80) NOT NULL,
  `referenceTitle` varchar(80) NOT NULL,
  `referenceCompany` varchar(80) NOT NULL,
  `referencePhone` varchar(20) NOT NULL,
  `referenceEmail` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`referenceId`),
  -- Allow multiple job applications to reference the same email and allow NULL emails
  UNIQUE KEY `jobApp_referenceEmail` (`JobApplicationId`,`referenceEmail`),
  KEY `JobApplicationId` (`JobApplicationId`),
  CONSTRAINT `fk_ref_jobapp` FOREIGN KEY (`JobApplicationId`) REFERENCES `JobApplication` (`JobApplicationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;