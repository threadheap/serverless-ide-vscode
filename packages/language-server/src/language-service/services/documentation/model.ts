export const LIST_TYPE: 'List' = 'List';
export const MAP_TYPE: 'Map' = 'Map';
export const STRING_TYPE = 'String';
export const INTEGER_TYPE = 'Integer';
export const BOOLEAN_TYPE = 'Boolean';

export type PrimitiveType =
	| typeof STRING_TYPE
	| typeof INTEGER_TYPE
	| typeof BOOLEAN_TYPE;

export type ItemType = {
	Type?: typeof LIST_TYPE | typeof MAP_TYPE | string;
	ItemType?: string;
	PrimitiveType?: PrimitiveType;
	PrimitiveItemType?: typeof STRING_TYPE | typeof INTEGER_TYPE;
};

export type Property = {
	Documentation: string;
	Required: boolean;
	UpdateType?: 'Mutable' | 'Immutable' | 'Conditional';
	DuplicatesAllowed?: boolean;
} & ItemType;

export type Attribute = ItemType;

export interface PropertySpecification {
	Documentation: string;
	Properties: {
		[key: string]: Property;
	};
}

export interface ResourceSpecification {
	Documentation: string;
	Attributes: {
		[key: string]: Attribute;
	};
	Properties: {
		[key: string]: Property;
	};
}

export interface Specification {
	PropertyTypes: {
		[key: string]: PropertySpecification;
	};
	ResourceTypes: {
		[key: string]: ResourceSpecification;
	};
}
