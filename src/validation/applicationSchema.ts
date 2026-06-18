import { z } from 'zod'

const isValidDateString = (value: unknown) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

const isValidEmploymentPeriodString = (value: unknown) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}(?:-\d{2})?$/.test(value)) {
    return false
  }

  const monthKey = value.slice(0, 7)
  const parsed = new Date(`${monthKey}-01T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 7) === monthKey
}

const isValidYearString = (value: unknown) => {
  return typeof value === 'string' && /^[0-9]{4}$/.test(value)
}

const parseDateUTC = (value: string) => new Date(`${value}T00:00:00Z`)
const parseMonthAsDateUTC = (value: string) => new Date(`${value}-01T00:00:00Z`)

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

const OptionalBooleanLikeSchema = z.preprocess((value) => {
  if (value === '' || value === undefined || value === null) {
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
}, z.boolean().optional())

const DraftDateSchema = z.preprocess((value) => {
  if (value === '' || value === undefined) {
    return null
  }

  return value
}, z.union([
  z.string().refine((s) => !Number.isNaN(Date.parse(s)), { message: 'Invalid date' }),
  z.null(),
]))

const YearSchema = z.preprocess((value) => {
  if (value === '' || value === undefined) {
    return null
  }

  return value
}, z.union([
  z.string().regex(/^[0-9]{4}$/, { message: 'Year must be 4 digits' }),
  z.null(),
]))

const EntityIdSchema = z.union([z.string(), z.number().int()])
const OptionalEntityIdSchema = EntityIdSchema.optional()
const NullableEntityIdSchema = EntityIdSchema.nullable().optional()

export const ApplicantSchema = z.object({
  applicantId: OptionalEntityIdSchema,
  applicantName: z.string().min(1),
  homeAddress: z.string().min(1),
  phoneNumber: z.string().min(1),
  emailAddress: z.string().email(),
  linkedInUrl: z.string().optional().nullable(),
  citizenshipStatus: z.string().min(1),
  hasCriminalHistory: NullableBooleanSchema,
})

export const EducationSchema = z.object({
  educationId: OptionalEntityIdSchema,
  schoolId: OptionalEntityIdSchema,
  schoolName: z.string().min(1),
  schoolLocation: z.string().min(1),
  startYear: YearSchema,
  endYear: YearSchema,
  degreeReceived: z.string().min(1),
  programName: z.string().min(1),
  isCurrent: OptionalBooleanLikeSchema,
}).superRefine((value, context) => {
  const { startYear, endYear } = value

  if (startYear && isValidYearString(startYear)) {
    const currentYear = new Date().getUTCFullYear()
    if (Number(startYear) > currentYear) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startYear'],
        message: 'Start year cannot be in the future',
      })
    }
  }

  if (!value.isCurrent && startYear && endYear && isValidYearString(startYear) && isValidYearString(endYear)) {
    if (Number(endYear) < Number(startYear)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endYear'],
        message: 'End year cannot be earlier than the start year',
      })
    }
  }
})

export const EmploymentSchema = z.object({
  EmploymentHistoryId: OptionalEntityIdSchema,
  companyId: OptionalEntityIdSchema,
  companyName: z.string().min(1),
  companyAddress: z.string().optional().nullable(),
  companyPhone: z.string().optional().nullable(),
  workPosition: z.string().min(1),
  reasonForLeaving: z.string().optional().nullable(),
  startDate: DraftDateSchema,
  endDate: DraftDateSchema,
  isEmployed: OptionalBooleanLikeSchema,
}).superRefine((value, context) => {
  const startDate = typeof value.startDate === 'string' ? value.startDate : ''
  const endDate = typeof value.endDate === 'string' ? value.endDate : ''
  const isEmployed = value.isEmployed === true

  if (startDate && !isValidEmploymentPeriodString(startDate)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['startDate'],
      message: 'Start date must be a valid month',
    })
  }

  if (!startDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['startDate'],
      message: 'Start date is required',
    })
  }

  if (startDate && isValidEmploymentPeriodString(startDate)) {
    const start = parseMonthAsDateUTC(startDate.slice(0, 7))
    const today = new Date()
    const currentMonthUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))

    if (start.getTime() > currentMonthUTC.getTime()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startDate'],
        message: 'Start date cannot be in the future',
      })
    }

    if (!isEmployed) {
      if (!endDate) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endDate'],
          message: 'End date is required when not currently employed',
        })
      } else if (!isValidEmploymentPeriodString(endDate)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endDate'],
          message: 'End date must be a valid month',
        })
      } else if (parseMonthAsDateUTC(endDate.slice(0, 7)).getTime() < start.getTime()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endDate'],
          message: 'End date cannot be earlier than the start date',
        })
      }
    }
  }
})

export const TrainingSchema = z.object({
  trainingId: NullableEntityIdSchema,
  trainingTitle: z.string().min(1),
  trainingDescription: z.string().min(1),
  trainingInstructor: z.string().min(1),
  trainingDurationHours: z.preprocess(
    (value) => (typeof value === 'string' || typeof value === 'number' ? Number(value) : value),
    z.number().min(0, { message: 'Duration must be a positive number' }),
  ),
  completionDate: DraftDateSchema,
})

export const CertificateSchema = z.object({
  certificateId: NullableEntityIdSchema,
  certificateName: z.string().min(1),
  issuingAuthority: z.string().min(1),
  validityMonths: z.preprocess(
    (value) => (typeof value === 'string' || typeof value === 'number' ? Number(value) : value),
    z.number().min(1, { message: 'Validity must be at least 1 month' }),
  ),
  dateIssued: DraftDateSchema,
})

export const ReferenceSchema = z.object({
  referenceId: OptionalEntityIdSchema,
  referenceName: z.string().min(1),
  referenceTitle: z.string().min(1),
  referenceCompany: z.string().min(1),
  referencePhone: z.string().min(1),
  referenceEmail: z.string().email().optional().nullable(),
})

export const JobApplicationSchema = z.object({
  JobApplicationId: z.string().optional(),
  appliedPosition: z.string().min(1),
  JobApplicationDate: z.string().refine((s) => !Number.isNaN(Date.parse(s)), { message: 'JobApplicationDate must be a valid date' }),
  availableStartDate: z.string().optional().nullable(),
  expectedSalary: z.union([z.string(), z.number()]).optional().nullable(),
  agreesToDrugTest: OptionalBooleanLikeSchema,
  agreedToTerms: CoerceBooleanSchema.optional(),
  dateAgreed: z.string().optional(),
}).superRefine((value, context) => {
  if (value.availableStartDate && !isValidDateString(value.availableStartDate)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['availableStartDate'],
      message: 'Available start date must be a valid date',
    })
  }

  if (value.JobApplicationDate && !isValidDateString(value.JobApplicationDate)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['JobApplicationDate'],
      message: 'Job application date must be a valid date',
    })
  }

  // Disallow job application dates that are earlier than today (in UTC)
  if (value.JobApplicationDate && isValidDateString(value.JobApplicationDate)) {
    const appDate = parseDateUTC(value.JobApplicationDate)
    const today = new Date()
    const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))

    if (appDate.getTime() < todayUTC.getTime()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JobApplicationDate'],
        message: 'Job application date cannot be earlier than today',
      })
    }
  }

  if (
    value.availableStartDate &&
    value.JobApplicationDate &&
    isValidDateString(value.availableStartDate) &&
    isValidDateString(value.JobApplicationDate) &&
    parseDateUTC(value.availableStartDate).getTime() < parseDateUTC(value.JobApplicationDate).getTime()
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['availableStartDate'],
      message: 'Available start date cannot be earlier than the job application date',
    })
  }
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

export const ProfileSyncSchema = z.object({
  applicantId: EntityIdSchema,
  education: z.array(EducationSchema).optional(),
  employmentHistory: z.array(EmploymentSchema).optional(),
  trainings: z.array(TrainingSchema).optional(),
  certificates: z.array(CertificateSchema).optional(),
})

export const ApplicationSyncSchema = z.object({
  jobApplication: JobApplicationSchema,
  references: z.array(ReferenceSchema).optional(),
  resumeSettings: z.object({ resumeTemplate: z.string().optional(), previewFont: z.string().optional() }).optional(),
})

export const ApplicationStatusSyncSchema = z.object({
  jobApplication: z.object({
    JobApplicationId: EntityIdSchema,
    JobApplicationStatus: z.string(),
  }),
})

export type ApplicationPayload = z.infer<typeof ApplicationPayloadSchema>
