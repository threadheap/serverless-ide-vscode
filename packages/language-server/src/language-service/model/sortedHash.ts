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

	add(key: string, item: TItem) {
		if (this.hash[key]) {
			throw new Error(`Object with \`${key}\` already exists.`)
		}

		this.sequence.push(key)
		this.hash[key] = item
	}

	get(key: string): TItem | void {
		return this.hash[key]
	}

	contains(key: string): boolean {
		return key in this.hash
	}

	getList(): TItem[] {
		return this.map(item => item)
	}

	map<TValue>(callback: (item: TItem, index: number) => TValue): TValue[] {
		return this.sequence.map((key, index) => {
			return callback(this.hash[key], index)
		})
	}

	forEach(callback: (item: TItem, index: number) => void) {
		return this.sequence.forEach((key, index) => {
			return callback(this.hash[key], index)
		})
	}

	insertAtIndex(key: string, item: TItem, index: number) {
		this.sequence = [
			...this.sequence.slice(0, index),
			key,
			...this.sequence.slice(index)
		]
		this.hash[key] = item
	}

	remove(key: string) {
		const index = this.sequence.indexOf(key)

		if (index !== -1) {
			this.sequence.splice(index, 1)
			delete this.hash[key]
		}
	}

	serialize() {
		return {
			sequence: [...this.sequence],
			hash: {
				...this.hash
			}
		}
	}
}
