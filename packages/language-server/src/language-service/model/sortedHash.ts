export interface SerializedSortedHash<TItem> {
	sequence: string[]
	hash: {
		[key: string]: TItem
	}
}

export class SortedHash<TItem> {
	private sequence: string[]
	private hash: { [key: string]: TItem }

	constructor(
		defaultValue: SerializedSortedHash<TItem> = { sequence: [], hash: {} }
	) {
		this.sequence = defaultValue.sequence
		this.hash = defaultValue.hash
	}

	public add(key: string, item: TItem) {
		if (this.hash[key]) {
			throw new Error(`Object with \`${key}\` already exists.`)
		}

		this.sequence.push(key)
		this.hash[key] = item
	}

	public get(key: string): TItem | void {
		return this.hash[key]
	}

	public insertAtIndex(key: string, item: TItem, index: number) {
		this.sequence = [
			...this.sequence.slice(0, index),
			key,
			...this.sequence.slice(index)
		]
		this.hash[key] = item
	}

	public remove(key: string) {
		const index = this.sequence.indexOf(key)

		if (index !== -1) {
			this.sequence.splice(index, 1)
			delete this.hash[key]
		}
	}

	public serialize() {
		return {
			sequence: [...this.sequence],
			hash: {
				...this.hash
			}
		}
	}
}
