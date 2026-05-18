export type Applicant = {
  applicantId: string
  applicantName: string
  homeAddress: string
  phoneNumber: string
  emailAddress: string
  linkedInUrl: string
  citizenshipStatus: string
  hasCriminalHistory: boolean | null
  agreesToDrugTest: boolean | null
}

export type JobApplication = {
  JobApplicationId: string
  applicantId: string
  appliedPosition: string
  JobApplicationDate: string
  lastUpdated: string
  availableStartDate: string
  expectedSalary: string
  resumeFileUrl: string
}

export type Education = {
  educationId: string
  applicantId: string
  schoolName: string
  schoolLocation: string
  yearsAttended: string
  degreeReceived: string
  programName: string
}

export type EmploymentHistory = {
  EmploymentHistoryId: string
  applicantId: string
  companyName: string
  workAddress: string
  workPosition: string
  reasonForLeaving: string
}

export type ApplicantReference = {
  referenceId: string
  applicantId: string
  referenceName: string
  referenceTitle: string
  referenceCompany: string
  referencePhone: string
  referenceEmail: string
}

export type Training = {
  trainingId: string
  trainingTitle: string
  trainingDescription: string
  trainingInstructor: string
  trainingDurationHours: string
}

export type Certificate = {
  certificateId: string
  certificateName: string
  issuingAuthority: string
  validityMonths: string
}
