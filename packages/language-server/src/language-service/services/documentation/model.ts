export const LIST_TYPE: 'List' = 'List';

export type SinglePrimitiveType = {
	PrimitiveType: string;
};

export type SingleType = {
	Type: string;
};

export type ArrayPrimitiveType = {
	Type: typeof LIST_TYPE;
	PrimitiveType: string;
};

export type ArrayType = {
	Type: typeof LIST_TYPE;
	PrimitiveItemType: string;
};

export type ItemType = {
	Type?: string;
	ItemType?: string;
	PrimitiveType?: string;
	PrimitiveItemType?: string;
};

export type Property = {
	Documentation: string;
	Required: boolean;
	UpdateType: 'Mutable' | 'Immutable' | 'Conditional';
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
