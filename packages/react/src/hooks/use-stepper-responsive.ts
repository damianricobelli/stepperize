import * as React from "react";

/**
 * Hook to get the orientation based on a media query.
 *
 * This hook listens to changes in the specified media query and returns a boolean
 * indicating whether the media query currently matches. It handles server-side rendering (SSR)
 * by initially returning `null` until the client-side JavaScript is executed.
 *
 * @param {string} query - The media query string to evaluate.
 * @returns {boolean | null} - A boolean indicating if the media query matches, or `null` during SSR.
 *
 * @example
 * const isMobile = useStepperResponsive("(max-width: 768px)");
 *
 * return (
 *   <div>
 *     {isMobile ? "Mobile screen" : "Desktop screen"}
 *   </div>
 * );
 */
export function useStepperResponsive(query: string): boolean | null {
	const { isServer } = useSSR();

	const [matches, setMatches] = React.useState(() => {
		if (!isServer) {
			return matchMedia(query).matches;
		}
		return null;
	});

	const mediaQueryListRef = React.useRef<MediaQueryList | null>(null);

	React.useEffect(() => {
		if (isServer) {
			return;
		}

		const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);

		if (mediaQueryListRef.current) {
			mediaQueryListRef.current.removeEventListener("change", onChange);
		}

		const mediaQueryList = matchMedia(query);
		mediaQueryListRef.current = mediaQueryList;

		mediaQueryList.addEventListener("change", onChange);
		setMatches(mediaQueryList.matches);

		return () => mediaQueryList.removeEventListener("change", onChange);
	}, [query, isServer]);

	return matches;
}

function useSSR() {
	const [isSSR, setIsSSR] = React.useState(true);

	React.useEffect(() => {
		setIsSSR(false);
	}, []);

	return {
		isServer: isSSR,
		isBrowser: !isSSR,
	};
}
