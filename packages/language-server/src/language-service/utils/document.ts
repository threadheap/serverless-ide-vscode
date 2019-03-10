import { TextDocument } from "vscode-languageserver";

const transformRegExp = /"?Transform"?:\s*"?AWS::Serverless-2016-10-31"?/
const slsServiceRegExp = /service:/
const slsProviderRegExp = /provider:/
const cfnResourcesRegExp = /"?Resources"?:/
const cfnResourceTypeRegExp = /(AWS|Custom)::/
const cfnFormatVersionRegExp = /AWSTemplateFormatVersion/

export const isServerlessFrameworkTemplate = (document: string): boolean => {
	return slsServiceRegExp.test(document) && slsProviderRegExp.test(document)
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

export const isSupportedDocument = (document?: TextDocument): boolean => {
	if (!document) {
		return false;
	}

	const uri = document.uri;

	const text = document.getText()

	if (text)

	return isSAMTemplate(document) || isCloudFormationTemplate(document)
}
