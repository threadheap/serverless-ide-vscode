import { sendException } from "../services/analytics"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PromiseProducer<TR> = (...args: any[]) => Promise<TR>

type PromiseProducerParams<TR, TF extends PromiseProducer<TR>> = TF extends (
	...args: infer P
) => Promise<TR>
	? P
	: never

export const promiseRejectionHandler = <
	TR,
	TProducer extends PromiseProducer<TR>
>(
	promiseProducer: TProducer
): PromiseProducer<void> => {
	return (...args: PromiseProducerParams<TR, TProducer>) =>
		promiseProducer(...args)
			.catch(err => {
				sendException(err)
			})
			.then()
}
