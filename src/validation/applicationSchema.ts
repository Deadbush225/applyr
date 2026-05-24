import { z } from 'zod'

const NullableBooleanSchema = z.preprocess((value) => {
  if (value === '' || value === undefined || value === null) {
    return null
  }

  if (value === true || value === false) {
    return value
  }

  if (value === 1 || value === '1' || value === 'true') {
    return true
  }

  if (value === 0 || value === '0' || value === 'false') {
    return false
  }

  return value
}, z.boolean().nullable())

const DraftDateSchema = z.preprocess((value) => {
  if (value === '' || value === undefined) {
    return null
  }

  return value
}, z.union([
  z.string().refine((s) => !Number.isNaN(Date.parse(s)), { message: 'Invalid date' }),
  z.null(),
]))

export const ApplicantSchema = z.object({
  applicantId: z.string().optional(),
  applicantName: z.string().min(1),
  homeAddress: z.string().min(1),
  phoneNumber: z.string().min(1),
  emailAddress: z.string().email(),
  linkedInUrl: z.string().optional().nullable(),
  citizenshipStatus: z.string().min(1),
  hasCriminalHistory: NullableBooleanSchema,
})

export const EducationSchema = z.object({
  educationId: z.string().optional(),
  schoolId: z.string().optional(),
  schoolName: z.string().min(1),
  schoolLocation: z.string().min(1),
  startYear: z.string().regex(/^[0-9]{4}$/),
  endYear: z.string().regex(/^[0-9]{4}$/),
  degreeReceived: z.string().min(1),
  programName: z.string().min(1),
})

export const EmploymentSchema = z.object({
  EmploymentHistoryId: z.string().optional(),
  companyId: z.string().optional(),
  companyName: z.string().min(1),
  companyAddress: z.string().optional().nullable(),
  companyPhone: z.string().optional().nullable(),
  workPosition: z.string().min(1),
  reasonForLeaving: z.string().optional().nullable(),
  startDate: DraftDateSchema,
  endDate: DraftDateSchema,
  isEmployed: z.boolean().optional(),
})

export const TrainingSchema = z.object({
  trainingId: z.string().optional(),
  trainingTitle: z.string().min(1),
  trainingDescription: z.string().optional().nullable(),
  trainingInstructor: z.string().optional().nullable(),
  trainingDurationHours: z.union([z.string(), z.number()]).optional(),
  completionDate: DraftDateSchema,
})

export const CertificateSchema = z.object({
  certificateId: z.string().optional(),
  certificateName: z.string().min(1),
  issuingAuthority: z.string().min(1),
  validityMonths: z.union([z.string(), z.number()]).optional(),
  dateIssued: DraftDateSchema,
})

export const ReferenceSchema = z.object({
  referenceId: z.string().optional(),
  referenceName: z.string().min(1),
  referenceTitle: z.string().min(1),
  referenceCompany: z.string().min(1),
  referencePhone: z.string().min(1),
  referenceEmail: z.string().email(),
})

export const JobApplicationSchema = z.object({
  JobApplicationId: z.string().optional(),
  appliedPosition: z.string().min(1),
  JobApplicationDate: z.string().refine((s) => !Number.isNaN(Date.parse(s)), { message: 'JobApplicationDate must be a valid date' }),
  availableStartDate: z.string().optional().nullable(),
  expectedSalary: z.union([z.string(), z.number()]).optional().nullable(),
  agreesToDrugTest: z.boolean().optional(),
  agreedToTerms: z.boolean().optional(),
  dateAgreed: z.string().optional(),
})

export const ApplicationPayloadSchema = z.object({
  applicant: ApplicantSchema,
  jobApplication: JobApplicationSchema,
  education: z.array(EducationSchema).optional(),
  employmentHistory: z.array(EmploymentSchema).optional(),
  trainings: z.array(TrainingSchema).optional(),
  certificates: z.array(CertificateSchema).optional(),
  references: z.array(ReferenceSchema).optional(),
  resumeSettings: z.object({ resumeTemplate: z.string().optional(), previewFont: z.string().optional() }).optional(),
})

export type ApplicationPayload = z.infer<typeof ApplicationPayloadSchema>
