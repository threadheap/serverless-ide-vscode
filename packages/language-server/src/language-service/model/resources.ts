import { SortedHash } from "./sortedHash"

export interface ResourceDefinition {
	id: string
	resourceType: string | void
}

export type ResourcesDefinitions = SortedHash<ResourceDefinition>
