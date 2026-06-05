import { C, CodeFrame, F, K, P, S, T } from "./shared";

/**
 * A hand-tokenized, accurate v7 snippet. Shows the entire mental model:
 * defineStepper → useStepper → match → next/prev — the whole API at a glance.
 */
export function CodePreview() {
	return (
		<CodeFrame filename="checkout.tsx">
			<pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed">
				<code>
					<K>import</K> <P>{"{ "}</P>
					<F>defineStepper</F>
					<P>{" }"}</P> <K>from</K> <S>"@stepperize/react"</S>
					<P>;</P>
					{"\n\n"}
					<K>const</K> checkout <P>=</P> <F>defineStepper</F>
					<P>([</P>
					{"\n"}
					{"  "}
					<P>{"{ "}</P>id<P>:</P> <S>"shipping"</S>
					<P>,</P> title<P>:</P> <S>"Shipping"</S> <P>{"},"}</P>
					{"\n"}
					{"  "}
					<P>{"{ "}</P>id<P>:</P> <S>"payment"</S>
					<P>,</P>
					{"  "}title<P>:</P> <S>"Payment"</S> {"  "}
					<P>{"},"}</P>
					{"\n"}
					{"  "}
					<P>{"{ "}</P>id<P>:</P> <S>"review"</S>
					<P>,</P>
					{"   "}title<P>:</P> <S>"Review"</S> {"   "}
					<P>{"},"}</P>
					{"\n"}
					<P>]);</P>
					{"\n\n"}
					<K>function</K> <F>Checkout</F>
					<P>() {"{"}</P>
					{"\n"}
					{"  "}
					<K>const</K> stepper <P>=</P> checkout<P>.</P>
					<F>useStepper</F>
					<P>();</P>
					{"\n\n"}
					{"  "}
					<C>{"// exhaustive — TypeScript checks every step id"}</C>
					{"\n"}
					{"  "}
					<K>return</K> stepper<P>.</P>
					<F>match</F>
					<P>({"{"}</P>
					{"\n"}
					{"    "}shipping<P>:</P> <P>{"() =>"}</P> <P>{"<"}</P>
					<T>Shipping</T> <P>{"/>,"}</P>
					{"\n"}
					{"    "}payment<P>:</P>
					{"  "}
					<P>{"() =>"}</P> <P>{"<"}</P>
					<T>Payment</T> <P>{"/>,"}</P>
					{"\n"}
					{"    "}review<P>:</P>
					{"   "}
					<P>{"() =>"}</P> <P>{"<"}</P>
					<T>Review</T> <P>{"/>,"}</P>
					{"\n"}
					{"  "}
					<P>{"});"}</P>
					{"\n"}
					<P>{"}"}</P>
				</code>
			</pre>
		</CodeFrame>
	);
}
