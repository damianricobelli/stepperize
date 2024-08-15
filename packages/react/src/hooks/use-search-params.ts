import * as React from "react";

interface SearchParams {
	[key: string]: string | null;
}

/**
 * Hook to access the current search params and update them.
 *
 * @returns {[SearchParams, (params: SearchParams) => void]} An array containing the current search params and a function to update them.
 */
export const useSearchParams = (): [
	SearchParams,
	(params: SearchParams) => void,
] => {
	const { isServer } = useSSR();

	if (isServer) {
		return [{}, () => {}];
	}

	const [searchParams, setSearchParamsState] =
		React.useState<SearchParams>(getSearchParams);

	/**
	 * Updates the search params in the URL.
	 *
	 * @param {SearchParams} params - The search params to set. Use `null` to remove a param.
	 */
	const setSearchParams = React.useCallback((params: SearchParams) => {
		const newSearchParams = new URLSearchParams(window.location.search);

		for (const key of Object.keys(params)) {
			if (params[key] === null) {
				newSearchParams.delete(key);
			} else {
				newSearchParams.set(key, params[key]);
			}
		}

		window.history.pushState(
			{},
			"",
			`${window.location.pathname}?${newSearchParams.toString()}`,
		);
		setSearchParamsState(getSearchParams());
	}, []);

	React.useEffect(() => {
		const handlePopState = () => {
			setSearchParamsState(getSearchParams());
		};

		window.addEventListener("popstate", handlePopState);

		return () => {
			window.removeEventListener("popstate", handlePopState);
		};
	}, []);

	return [searchParams, setSearchParams];
};

/**
 * Retrieves the current search params from the URL.
 *
 * @returns {SearchParams} The current search params.
 */
const getSearchParams = (): SearchParams => {
	const params: SearchParams = {};
	const urlSearchParams = new URLSearchParams(window.location.search);

	urlSearchParams.forEach((value, key) => {
		params[key] = value;
	});

	return params;
};

const useSSR = () => {
	const isBrowser = typeof window !== "undefined";

	const useSSRObject = React.useMemo(
		() => ({
			isBrowser,
			isServer: !isBrowser,
			canUseWorkers: typeof Worker !== "undefined",
			canUseEventListeners: isBrowser && !!window.addEventListener,
			canUseViewport: isBrowser && !!window.screen,
		}),
		[isBrowser],
	);

	return useSSRObject;
};
