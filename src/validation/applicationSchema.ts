import { z } from 'zod'

// Helper: Check if date string is valid and not in the future
const isValidDateNotInFuture = (dateStr: string): boolean => {
  if (!dateStr) return false
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return false
  // Compare date portion only (ignore time)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  return date <= today
}

// Helper: Check if year is valid and not in the future
const isValidYearNotInFuture = (yearStr: string): boolean => {
  const year = parseInt(yearStr, 10)
  if (Number.isNaN(year) || year < 1900 || year > 9999) return false
  const currentYear = new Date().getFullYear()
  return year <= currentYear
}

// Helper: Validate and coerce salary to positive number
const coerceSalary = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (typeof num !== 'number' || Number.isNaN(num)) return null
  if (num < 0) return null
  return num
}

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

const CoerceBooleanSchema = z.preprocess((value) => {
  if (value === '' || value === undefined) {
    return undefined
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
}, z.boolean())

const DraftDateSchema = z.preprocess((value) => {
  if (value === '' || value === undefined) {
    return null
  }

  return value
}, z.union([
  z.string().refine((s) => !Number.isNaN(Date.parse(s)), { message: 'Invalid date format' }),
  z.null(),
]))

const ValidatedDateSchema = DraftDateSchema.refine(
  (val) => val === null || isValidDateNotInFuture(val),
  { message: 'Date cannot be in the future' }
)

const OptionalPhoneSchema = z.string().optional().nullable().superRefine((value, ctx) => {
  if (value === null || value === undefined || value.trim() === '') {
    return
  }

  const trimmed = value.trim()
  if (trimmed.startsWith('09')) {
    if (!/^09\d{9}$/.test(trimmed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Mobile numbers must be 11 digits.',
      })
    }
    return
  }

  if (!/^[0-9\-\s]{8,12}$/.test(trimmed)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Invalid landline format.',
    })
  }
})

const RequiredPhoneSchema = z.string().min(1, 'Reference phone is required').superRefine((value, ctx) => {
  const trimmed = value.trim()
  if (trimmed.startsWith('09')) {
    if (!/^09\d{9}$/.test(trimmed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Mobile numbers must be 11 digits.',
      })
    }
    return
  }

  if (!/^[0-9\-\s]{8,12}$/.test(trimmed)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Invalid landline format.',
    })
  }
})

export const ApplicantSchema = z.object({
  applicantId: z.string().optional(),
  applicantName: z.string().min(1, 'Name is required'),
  homeAddress: z.string().min(1, 'Address is required'),
  phoneNumber: z.string().min(1, 'Phone number is required'),
  emailAddress: z.string().email('Invalid email format'),
  linkedInUrl: z.string().optional().nullable(),
  citizenshipStatus: z.string().min(1, 'Citizenship status is required'),
  hasCriminalHistory: NullableBooleanSchema,
})

export const EducationSchema = z.object({
  educationId: z.string().optional(),
  schoolId: z.string().optional(),
  schoolName: z.string().min(1, 'School name is required'),
  schoolLocation: z.string().min(1, 'School location is required'),
  startYear: z.string()
    .regex(/^[0-9]{4}$/, 'Start year must be a 4-digit year')
    .refine(
      (val) => isValidYearNotInFuture(val),
      { message: 'Start year cannot be in the future' }
    ),
  endYear: z.string()
    .regex(/^[0-9]{4}$/, 'End year must be a 4-digit year'),
  degreeReceived: z.string().min(1, 'Degree is required'),
  programName: z.string().min(1, 'Program name is required'),
  isCurrent: z.boolean().optional(),
}).superRefine((data, ctx) => {
  // If isCurrent is true, endYear can be null or future
  if (data.isCurrent) {
    return
  }
  
  // If not current, endYear must be valid and not in future
  if (!data.endYear || !/^[0-9]{4}$/.test(data.endYear)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endYear'],
      message: 'End year is required and must be a 4-digit year',
    })
    return
  }

  if (!isValidYearNotInFuture(data.endYear)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endYear'],
      message: 'End year cannot be in the future',
    })
  }

  // Chronological validation: endYear >= startYear
  const startYear = parseInt(data.startYear, 10)
  const endYear = parseInt(data.endYear, 10)
  if (endYear < startYear) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endYear'],
      message: 'End year must be after or equal to start year',
    })
  }
})

export const EmploymentSchema = z.object({
  EmploymentHistoryId: z.string().optional(),
  companyId: z.string().optional(),
  companyName: z.string().min(1, 'Company name is required'),
  companyAddress: z.string().optional().nullable(),
  companyPhone: OptionalPhoneSchema,
  workPosition: z.string().min(1, 'Work position is required'),
  reasonForLeaving: z.string().optional().nullable(),
  startDate: ValidatedDateSchema,
  endDate: ValidatedDateSchema,
  isEmployed: z.boolean().optional(),
}).superRefine((data, ctx) => {
  // If isEmployed is true, endDate can be null or omitted
  if (data.isEmployed) {
    return
  }

  // If not employed (ended), endDate must be present
  if (!data.endDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endDate'],
      message: 'End date is required if employment has ended',
    })
    return
  }

  // startDate must be present
  if (!data.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['startDate'],
      message: 'Start date is required',
    })
    return
  }

  // Chronological validation: endDate >= startDate
  const startDate = new Date(data.startDate)
  const endDate = new Date(data.endDate)
  if (endDate < startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endDate'],
      message: 'End date must be after or equal to start date',
    })
  }
})

export const TrainingSchema = z.object({
  trainingId: z.string().nullable().optional(),
  trainingTitle: z.string().min(1, 'Training title is required'),
  trainingDescription: z.string().min(1, 'Description is required'),
  trainingInstructor: z.string().min(1, 'Instructor is required'),
  trainingDurationHours: z.union([z.string(), z.number()]).pipe(
    z.coerce.number().min(0, { message: 'Duration must be a non-negative number' })
  ),
  completionDate: ValidatedDateSchema,
})

const TrainingsArraySchema = z.array(TrainingSchema).superRefine((trainings, ctx) => {
  const seen = new Map<string, number>()
  trainings.forEach((training, index) => {
    const trainingId = training.trainingId ? String(training.trainingId).trim() : ''
    const title = training.trainingTitle ? training.trainingTitle.trim().toLowerCase() : ''
    const instructor = training.trainingInstructor ? training.trainingInstructor.trim().toLowerCase() : ''
    const key = trainingId ? `id:${trainingId}` : title ? `title:${title}|${instructor}` : ''

    if (!key) return
    if (seen.has(key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, 'trainingTitle'],
        message: 'You already added this training. Please update its details instead.',
      })
      return
    }

    seen.set(key, index)
  })
})

export const CertificateSchema = z.object({
  certificateId: z.string().nullable().optional(),
  certificateName: z.string().min(1, 'Certificate name is required'),
  issuingAuthority: z.string().min(1, 'Issuing authority is required'),
  validityMonths: z.union([z.string(), z.number()]).pipe(
    z.coerce.number().min(1, { message: 'Validity must be at least 1 month' })
  ),
  dateIssued: ValidatedDateSchema,
})

const CertificatesArraySchema = z.array(CertificateSchema).superRefine((certs, ctx) => {
  const seen = new Map<string, number>()
  certs.forEach((cert, index) => {
    const certId = cert.certificateId ? String(cert.certificateId).trim() : ''
    const name = cert.certificateName ? cert.certificateName.trim().toLowerCase() : ''
    const authority = cert.issuingAuthority ? cert.issuingAuthority.trim().toLowerCase() : ''
    const key = certId ? `id:${certId}` : name ? `name:${name}|${authority}` : ''

    if (!key) return
    if (seen.has(key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, 'certificateName'],
        message: 'You already added this certificate. Please update its dates instead.',
      })
      return
    }

    seen.set(key, index)
  })
})

export const ReferenceSchema = z.object({
  referenceId: z.string().optional(),
  referenceName: z.string().min(1, 'Reference name is required'),
  referenceTitle: z.string().min(1, 'Reference title is required'),
  referenceCompany: z.string().min(1, 'Reference company is required'),
  referencePhone: RequiredPhoneSchema,
  referenceEmail: z.string().email('Invalid email format'),
})

export const JobApplicationSchema = z.object({
  JobApplicationId: z.string().optional(),
  appliedPosition: z.string().min(1, 'Applied position is required'),
  JobApplicationDate: z.string()
    .refine((s) => !Number.isNaN(Date.parse(s)), { message: 'Invalid application date format' })
    .refine(
      (s) => isValidDateNotInFuture(s),
      { message: 'Application date cannot be in the future' }
    ),
  availableStartDate: z.string().optional().nullable(),
  expectedSalary: z.union([z.string(), z.number()])
    .optional()
    .nullable()
    .refine(
      (val) => val === null || val === undefined || val === '' || coerceSalary(val) !== null,
      { message: 'Salary must be a non-negative number' }
    ),
  agreesToDrugTest: z.boolean().optional(),
  agreedToTerms: CoerceBooleanSchema.optional(),
  dateAgreed: z.string().optional(),
})

export const ApplicationPayloadSchema = z.object({
  applicant: ApplicantSchema,
  jobApplication: JobApplicationSchema,
  education: z.array(EducationSchema).optional(),
  employmentHistory: z.array(EmploymentSchema).optional(),
  trainings: TrainingsArraySchema.optional(),
  certificates: CertificatesArraySchema.optional(),
  references: z.array(ReferenceSchema).optional(),
  resumeSettings: z.object({ resumeTemplate: z.string().optional(), previewFont: z.string().optional() }).optional(),
})

export type ApplicationPayload = z.infer<typeof ApplicationPayloadSchema>
