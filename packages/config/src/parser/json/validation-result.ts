import localize from "./localize"

export interface IProblem {
	location: IRange
	severity: ProblemSeverity
	code?: ErrorCode
	message: string
}

export interface IRange {
	start: number
	end: number
}

export enum ProblemSeverity {
	Error,
	Warning
}

export enum ErrorCode {
	Undefined = 0,
	EnumValueMismatch = 1,
	CommentsNotAllowed = 2
}

export class ValidationResult {
	problems: IProblem[]

	propertiesMatches: number
	propertiesValueMatches: number
	primaryValueMatches: number
	enumValueMatch: boolean
	enumValues: any[]
	warnings
	errors

	constructor() {
		this.problems = []
		this.propertiesMatches = 0
		this.propertiesValueMatches = 0
		this.primaryValueMatches = 0
		this.enumValueMatch = false
		this.enumValues = null
		this.warnings = []
		this.errors = []
	}

	hasProblems(): boolean {
		return !!this.problems.length
	}

	mergeAll(validationResults: ValidationResult[]): void {
		validationResults.forEach(validationResult => {
			this.merge(validationResult)
		})
	}

	merge(validationResult: ValidationResult): void {
		this.problems = this.problems.concat(validationResult.problems)
	}

	mergeEnumValues(validationResult: ValidationResult): void {
		if (
			!this.enumValueMatch &&
			!validationResult.enumValueMatch &&
			this.enumValues &&
			validationResult.enumValues
		) {
			this.enumValues = this.enumValues.concat(
				validationResult.enumValues
			)
			for (const error of this.problems) {
				if (error.code === ErrorCode.EnumValueMismatch) {
					error.message = localize(
						"enumWarning",
						"Value is not accepted. Valid values: {0}.",
						this.enumValues.map(v => JSON.stringify(v)).join(", ")
					)
				}
			}
		}
	}

	mergePropertyMatch(propertyValidationResult: ValidationResult): void {
		this.merge(propertyValidationResult)
		this.propertiesMatches++
		if (
			propertyValidationResult.enumValueMatch ||
			(!this.hasProblems() && propertyValidationResult.propertiesMatches)
		) {
			this.propertiesValueMatches++
		}
		if (
			propertyValidationResult.enumValueMatch &&
			propertyValidationResult.enumValues &&
			propertyValidationResult.enumValues.length === 1
		) {
			this.primaryValueMatches++
		}
	}

	compareGeneric(other: ValidationResult): number {
		const hasProblems = this.hasProblems()
		if (hasProblems !== other.hasProblems()) {
			return hasProblems ? -1 : 1
		}
		if (this.enumValueMatch !== other.enumValueMatch) {
			return other.enumValueMatch ? -1 : 1
		}
		if (this.propertiesValueMatches !== other.propertiesValueMatches) {
			return this.propertiesValueMatches - other.propertiesValueMatches
		}
		if (this.primaryValueMatches !== other.primaryValueMatches) {
			return this.primaryValueMatches - other.primaryValueMatches
		}
		return this.propertiesMatches - other.propertiesMatches
	}
}
