"use strict"

import { CompletionItem, MarkedString } from "vscode-json-languageservice"

export interface JSONWorkerContribution {
	getInfoContribution(
		uri: string,
		location: JSONPath
	): Promise<MarkedString[]>
	collectPropertyCompletions(
		uri: string,
		location: JSONPath,
		currentWord: string,
		addValue: boolean,
		isLast: boolean,
		result: CompletionsCollector
	): Promise<any>
	collectValueCompletions(
		uri: string,
		location: JSONPath,
		propertyKey: string,
		result: CompletionsCollector
	): Promise<any>
	collectDefaultCompletions(
		uri: string,
		result: CompletionsCollector
	): Promise<any>
	resolveCompletion?(item: CompletionItem): Promise<CompletionItem>
}
export type Segment = string | number
export type JSONPath = Segment[]

export interface CompletionsCollector {
	add(suggestion: CompletionItem): void
	error(message: string): void
	log(message: string): void
	setAsIncomplete(): void
	getNumberOfProposals(): number
}
