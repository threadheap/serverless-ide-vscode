import {
	CLOUD_FORMATION,
	DocumentType,
	SAM,
	SERVERLESS_FRAMEWORK
} from "../model/document"
import { UNKNOWN } from "./../model/document"

const transformRegExp = /"?'?Transform"?'?:\s*"?'?AWS::Serverless-2016-10-31"?'?/
const slsServiceRegExp = /service:/
const slsProviderRegExp = /provider:/
const slsProviderNameRegExp = /name: aws/
const cfnResourcesRegExp = /"?Resources"?:/
const cfnResourceTypeRegExp = /(AWS|Custom)::/
const cfnFormatVersionRegExp = /AWSTemplateFormatVersion/

export const isServerlessFrameworkTemplate = (document: string): boolean => {
	return (
		slsServiceRegExp.test(document) &&
		slsProviderRegExp.test(document) &&
		slsProviderNameRegExp.test(document)
	)
}

const isBaseCloudFormationTemplate = (document: string): boolean => {
	return (
		cfnFormatVersionRegExp.test(document) ||
		(cfnResourcesRegExp.test(document) &&
			cfnResourceTypeRegExp.test(document) &&
			!isServerlessFrameworkTemplate(document))
	)
}

const isBaseSAMTemplate = (document: string): boolean => {
	return transformRegExp.test(document)
}

export const isCloudFormationTemplate = (document: string): boolean => {
	return (
		isBaseCloudFormationTemplate(document) && !isBaseSAMTemplate(document)
	)
}

export const isSAMTemplate = (document: string): boolean => {
	return isBaseCloudFormationTemplate(document) && isBaseSAMTemplate(document)
}

export const getDocumentType = (text: string): DocumentType => {
	if (!text) {
		return UNKNOWN
	}

	if (text) {
		if (isSAMTemplate(text)) {
			return SAM
		} else if (isCloudFormationTemplate(text)) {
			return CLOUD_FORMATION
		} else if (isServerlessFrameworkTemplate(text)) {
			return SERVERLESS_FRAMEWORK
		}

		return UNKNOWN
	}
}

export const isSupportedDocument = (text: string): boolean => {
	const documentType = getDocumentType(text)

	const isSupported = documentType === SAM || documentType === CLOUD_FORMATION
	// documentType === SERVERLESS_FRAMEWORK

	return isSupported
}
