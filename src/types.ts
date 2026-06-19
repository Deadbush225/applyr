export type Applicant = {
  applicantId: number | string
  applicantName: string
  homeAddress: string
  phoneNumber: string
  emailAddress: string
  linkedInUrl: string
  citizenshipStatus: string
  hasCriminalHistory: boolean | null
  agreesToDrugTest: boolean | null
  trainings?: Training[]
  certificates?: Certificate[]
}

export type JobApplication = {
  JobApplicationId: string
  applicantId: number | string
  appliedPosition: string
  JobApplicationDate: string
  JobApplicationStatus?: string
  agreesToDrugTest?: boolean
  lastUpdated: string
  availableStartDate: string
  expectedSalary: string
  references?: ApplicantReference[]
  agreedToTerms?: boolean
  dateAgreed?: string
}

export type Education = {
  educationId: number | string
  id?: string
  applicantId: number | string
  isCurrent?: boolean
  schoolId?: number | string
  schoolName: string
  schoolLocation: string
  startYear: string | null
  endYear: string | null
  degreeReceived: string
  programName: string
}

export type EmploymentHistory = {
  EmploymentHistoryId: number | string
  id?: string
  applicantId: number | string
  companyName: string
  companyId?: number | string
  companyAddress: string
  workPosition: string
  reasonForLeaving?: string | null
  companyPhone?: string | null
  startDate: string
  endDate: string
  isEmployed?: boolean
}

export type ApplicantReference = {
  referenceId?: number | string
  applicantId: number | string
  referenceName: string
  referenceTitle: string
  referenceCompany: string
  referencePhone: string
  referenceEmail?: string | null
}

export type Training = {
  trainingId: number | string
  trainingTitle: string
  trainingDescription: string
  trainingDurationHours: string
  trainingInstructor: string
  completionDate?: string
}

export type Certificate = {
  certificateId: number | string
  certificateName: string
  issuingAuthority: string
  validityMonths: string
  dateIssued?: string
}

export type ApplicationResumeSettings = {
  JobApplicationId: string
  resumeTemplate: 'classic' | 'compact' | 'modern'
  previewFont: string
  lastUpdated?: string
}
