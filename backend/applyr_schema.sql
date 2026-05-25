/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-12.2.2-MariaDB, for Linux (x86_64)
--
-- Host: localhost    Database: eliazar225_job_application
-- ------------------------------------------------------
-- Server version	12.2.2-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `Applicant`
--

DROP TABLE IF EXISTS `Applicant`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Applicant` (
  `applicantId` varchar(50) NOT NULL,
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ApplicantCertificate`
--

DROP TABLE IF EXISTS `ApplicantCertificate`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ApplicantCertificate` (
  `applicantId` varchar(50) NOT NULL,
  `certificateId` varchar(50) NOT NULL,
  `dateIssued` date NOT NULL,
  PRIMARY KEY (`applicantId`,`certificateId`),
  KEY `fk_ApplicantCertificate_1_idx` (`certificateId`),
  CONSTRAINT `1` FOREIGN KEY (`applicantId`) REFERENCES `Applicant` (`applicantId`),
  CONSTRAINT `fk_ApplicantCertificate_1` FOREIGN KEY (`certificateId`) REFERENCES `Certificate` (`certificateId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ApplicantTraining`
--

DROP TABLE IF EXISTS `ApplicantTraining`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ApplicantTraining` (
  `applicantId` varchar(50) NOT NULL,
  `trainingId` varchar(50) NOT NULL,
  `completionDate` date NOT NULL,
  `trainingInstructor` varchar(80) DEFAULT NULL,
  PRIMARY KEY (`trainingId`,`applicantId`),
  KEY `fk_ApplicantTraining_2_idx` (`trainingId`),
  KEY `fk_ApplicantTraining_1_idx` (`applicantId`),
  CONSTRAINT `fk_ApplicantTraining_1` FOREIGN KEY (`applicantId`) REFERENCES `Applicant` (`applicantId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_ApplicantTraining_2` FOREIGN KEY (`trainingId`) REFERENCES `Training` (`trainingId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ApplicationResumeSettings`
--

DROP TABLE IF EXISTS `ApplicationResumeSettings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ApplicationResumeSettings` (
  `JobApplicationId` varchar(50) NOT NULL,
  `resumeTemplate` varchar(20) NOT NULL DEFAULT 'classic' CHECK (`resumeTemplate` in ('classic','compact','modern')),
  `previewFont` varchar(50) NOT NULL DEFAULT 'Helvetica',
  `lastUpdated` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`JobApplicationId`),
  CONSTRAINT `1` FOREIGN KEY (`JobApplicationId`) REFERENCES `JobApplication` (`JobApplicationId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Certificate`
--

DROP TABLE IF EXISTS `Certificate`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Certificate` (
  `certificateId` varchar(50) NOT NULL,
  `certificateName` varchar(80) NOT NULL,
  `issuingAuthority` varchar(80) NOT NULL,
  `validityMonths` int(2) NOT NULL,
  PRIMARY KEY (`certificateId`),
  UNIQUE KEY `certificateName_authority` (`certificateName`,`issuingAuthority`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Company`
--

DROP TABLE IF EXISTS `Company`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Company` (
  `companyId` varchar(50) NOT NULL,
  `companyName` varchar(80) NOT NULL,
  `companyAddress` varchar(100) NOT NULL,
  `companyPhone` varchar(16) NOT NULL,
  PRIMARY KEY (`companyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Education`
--

DROP TABLE IF EXISTS `Education`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Education` (
  `educationId` varchar(50) NOT NULL,
  `applicantId` varchar(50) NOT NULL,
  `schoolId` varchar(50) NOT NULL,
  `startYear` year(4) DEFAULT NULL,
  `endYear` year(4) DEFAULT NULL,
  `degreeReceived` varchar(30) NOT NULL,
  `programName` varchar(30) NOT NULL,
  PRIMARY KEY (`educationId`),
  KEY `applicantId` (`applicantId`),
  KEY `schoolId` (`schoolId`),
  CONSTRAINT `1` FOREIGN KEY (`applicantId`) REFERENCES `Applicant` (`applicantId`),
  CONSTRAINT `2` FOREIGN KEY (`schoolId`) REFERENCES `School` (`schoolId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `EmploymentHistory`
--

DROP TABLE IF EXISTS `EmploymentHistory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `EmploymentHistory` (
  `EmploymentHistoryId` varchar(50) NOT NULL,
  `applicantId` varchar(50) NOT NULL,
  `companyId` varchar(50) NOT NULL,
  `workPosition` varchar(80) NOT NULL,
  `reasonForLeaving` varchar(80) DEFAULT NULL,
  `startDate` date DEFAULT NULL,
  `endDate` date DEFAULT NULL,
  `isEmployed` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`EmploymentHistoryId`),
  KEY `applicantId` (`applicantId`),
  KEY `companyId` (`companyId`),
  CONSTRAINT `1` FOREIGN KEY (`applicantId`) REFERENCES `Applicant` (`applicantId`),
  CONSTRAINT `2` FOREIGN KEY (`companyId`) REFERENCES `Company` (`companyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `JobApplication`
--

DROP TABLE IF EXISTS `JobApplication`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `JobApplication` (
  `JobApplicationId` varchar(50) NOT NULL,
  `applicantId` varchar(50) NOT NULL,
  `appliedPosition` varchar(60) NOT NULL,
  `JobApplicationDate` date NOT NULL,
  `JobApplicationStatus` varchar(20) NOT NULL DEFAULT 'Pending',
  `availableStartDate` date DEFAULT NULL,
  `expectedSalary` decimal(10,2) DEFAULT NULL,
  `resumeFileUrl` varchar(255) DEFAULT NULL,
  `agreesToDrugTest` tinyint(1) NOT NULL DEFAULT 0,
  `agreedToTerms` tinyint(1) NOT NULL DEFAULT 1,
  `dateAgreed` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `lastUpdated` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`JobApplicationId`),
  KEY `applicantId` (`applicantId`),
  CONSTRAINT `1` FOREIGN KEY (`applicantId`) REFERENCES `Applicant` (`applicantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Reference`
--

DROP TABLE IF EXISTS `Reference`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Reference` (
  `referenceId` varchar(50) NOT NULL,
  `JobApplicationId` varchar(50) NOT NULL,
  `referenceName` varchar(80) NOT NULL,
  `referenceTitle` varchar(80) NOT NULL,
  `referenceCompany` varchar(80) NOT NULL,
  `referencePhone` varchar(20) NOT NULL,
  `referenceEmail` varchar(255) NOT NULL,
  PRIMARY KEY (`referenceId`),
  UNIQUE KEY `referenceEmail` (`referenceEmail`),
  KEY `JobApplicationId` (`JobApplicationId`),
  CONSTRAINT `1` FOREIGN KEY (`JobApplicationId`) REFERENCES `JobApplication` (`JobApplicationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `School`
--

DROP TABLE IF EXISTS `School`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `School` (
  `schoolId` varchar(50) NOT NULL,
  `schoolName` varchar(80) NOT NULL,
  `schoolLocation` varchar(100) NOT NULL,
  PRIMARY KEY (`schoolId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Training`
--

DROP TABLE IF EXISTS `Training`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `Training` (
  `trainingId` varchar(50) NOT NULL,
  `trainingTitle` varchar(80) NOT NULL,
  `trainingDescription` varchar(255) NOT NULL,
  `trainingDurationHours` int(3) NOT NULL,
  PRIMARY KEY (`trainingId`),
  UNIQUE KEY `trainingTitle` (`trainingTitle`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-05-23 17:39:48
