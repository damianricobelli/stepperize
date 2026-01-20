const ReactIcon = ({ className }: Icon.Props) => (
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="-11.5 -10.23 23 20.46" width={36} height={36} className={className}>
		<title> React Logo </title>
		<circle r="2.05" fill="#61dafb" />
		<g fill="none" stroke="#61dafb">
			<ellipse rx="11" ry="4.2" />
			<ellipse rx="11" ry="4.2" transform="rotate(60)" />
			<ellipse rx="11" ry="4.2" transform="rotate(120)" />
		</g>
	</svg>
);

const ShadcnIcon = ({ className }: Icon.Props) => (
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width={36} height={36} className={className}>
		<title>Shadcn Logo</title>
		<rect width="256" height="256" fill="none" />
		<line
			x1="208"
			y1="128"
			x2="128"
			y2="208"
			fill="none"
			stroke="currentColor"
			stroke-linecap="round"
			stroke-linejoin="round"
			strokeWidth="32"
		/>
		<line
			x1="192"
			y1="40"
			x2="40"
			y2="192"
			fill="none"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="32"
		/>
	</svg>
);

const VueIcon = ({ className }: Icon.Props) => (
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 261.76 226.69" width={36} height={36} className={className}>
		<title>Vue Logo</title>
		<g transform="matrix(1.3333 0 0 -1.3333 -76.311 313.34)">
			<g transform="translate(178.06 235.01)">
				<path d="m0 0-22.669-39.264-22.669 39.264h-75.491l98.16-170.02 98.16 170.02z" fill="#41b883" />
			</g>
			<g transform="translate(178.06 235.01)">
				<path d="m0 0-22.669-39.264-22.669 39.264h-36.227l58.896-102.01 58.896 102.01z" fill="#34495e" />
			</g>
		</g>
	</svg>
);

const AngularIcon = ({ className }: Icon.Props) => (
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 261.76 226.69" width={36} height={36} className={className}>
		<title>Angular Logo</title>
		<g clip-path="url(#a)">
			<path
				_ngcontent-ng-c249881476=""
				fill="url(#b)"
				d="m222.077 39.192-8.019 125.923L137.387 0l84.69 39.192Zm-53.105 162.825-57.933 33.056-57.934-33.056 11.783-28.556h92.301l11.783 28.556ZM111.039 62.675l30.357 73.803H80.681l30.358-73.803ZM7.937 165.115 0 39.192 84.69 0 7.937 165.115Z"
			/>
			<path
				_ngcontent-ng-c249881476=""
				fill="url(#c)"
				d="m222.077 39.192-8.019 125.923L137.387 0l84.69 39.192Zm-53.105 162.825-57.933 33.056-57.934-33.056 11.783-28.556h92.301l11.783 28.556ZM111.039 62.675l30.357 73.803H80.681l30.358-73.803ZM7.937 165.115 0 39.192 84.69 0 7.937 165.115Z"
			/>
		</g>
		<defs>
			<linearGradient
				_ngcontent-ng-c249881476=""
				id="b"
				x1="49.009"
				x2="225.829"
				y1="213.75"
				y2="129.722"
				gradientUnits="userSpaceOnUse"
			>
				<stop _ngcontent-ng-c249881476="" stop-color="#E40035" />
				<stop _ngcontent-ng-c249881476="" offset=".24" stop-color="#F60A48" />
				<stop _ngcontent-ng-c249881476="" offset=".352" stop-color="#F20755" />
				<stop _ngcontent-ng-c249881476="" offset=".494" stop-color="#DC087D" />
				<stop _ngcontent-ng-c249881476="" offset=".745" stop-color="#9717E7" />
				<stop _ngcontent-ng-c249881476="" offset="1" stop-color="#6C00F5" />
			</linearGradient>
			<linearGradient
				_ngcontent-ng-c249881476=""
				id="c"
				x1="41.025"
				x2="156.741"
				y1="28.344"
				y2="160.344"
				gradientUnits="userSpaceOnUse"
			>
				<stop _ngcontent-ng-c249881476="" stop-color="#FF31D9" />
				<stop _ngcontent-ng-c249881476="" offset="1" stop-color="#FF5BE1" stop-opacity="0" />
			</linearGradient>
			<clipPath _ngcontent-ng-c249881476="" id="a">
				<path _ngcontent-ng-c249881476="" fill="#fff" d="M0 0h223v236H0z" />
			</clipPath>
		</defs>
	</svg>
);

const SolidIcon = ({ className }: Icon.Props) => (
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 166 155.3" width={36} height={36} className={className}>
		<title>Solid Logo</title>
		<defs>
			<linearGradient id="solid-a" gradientUnits="userSpaceOnUse" x1="27.5" y1="3" x2="152" y2="63.5">
				<stop offset=".1" stopColor="#76b3e1" />
				<stop offset=".3" stopColor="#dcf2fd" />
				<stop offset="1" stopColor="#76b3e1" />
			</linearGradient>
			<linearGradient id="solid-b" gradientUnits="userSpaceOnUse" x1="95.8" y1="32.6" x2="74" y2="105.2">
				<stop offset="0" stopColor="#76b3e1" />
				<stop offset=".5" stopColor="#4377bb" />
				<stop offset="1" stopColor="#1f3b77" />
			</linearGradient>
			<linearGradient id="solid-c" gradientUnits="userSpaceOnUse" x1="18.4" y1="64.2" x2="144.3" y2="149.8">
				<stop offset="0" stopColor="#315aa9" />
				<stop offset=".5" stopColor="#518ac8" />
				<stop offset="1" stopColor="#315aa9" />
			</linearGradient>
			<linearGradient id="solid-d" gradientUnits="userSpaceOnUse" x1="75.2" y1="74.5" x2="24.4" y2="260.8">
				<stop offset="0" stopColor="#4377bb" />
				<stop offset=".5" stopColor="#1a336b" />
				<stop offset="1" stopColor="#1a336b" />
			</linearGradient>
		</defs>
		<g style={{ isolation: "isolate" }}>
			<path d="M163 35S110-4 69 5l-3 1c-6 2-11 5-14 9l-2 3-15 26 26 5c11 7 25 10 38 7l46 9 18-30z" fill="#76b3e1" />
			<path
				d="M163 35S110-4 69 5l-3 1c-6 2-11 5-14 9l-2 3-15 26 26 5c11 7 25 10 38 7l46 9 18-30z"
				opacity=".3"
				fill="url(#solid-a)"
			/>
			<path d="M52 35l-4 1c-17 5-22 21-13 35 10 13 31 20 48 15l62-21S92 26 52 35z" fill="#518ac8" />
			<path d="M52 35l-4 1c-17 5-22 21-13 35 10 13 31 20 48 15l62-21S92 26 52 35z" opacity=".3" fill="url(#solid-b)" />
			<path d="M134 80a45 45 0 00-48-15L24 85 4 120l112 19 20-36c4-7 3-15-2-23z" fill="url(#solid-c)" />
			<path d="M114 115a45 45 0 00-48-15L4 120s53 40 94 30l3-1c17-5 23-21 13-34z" fill="url(#solid-d)" />
		</g>
	</svg>
);

const SvelteIcon = ({ className }: Icon.Props) => (
	<svg xmlns="http://www.w3.org/2000/svg" width={36} height={36} viewBox="0 0 107 128" className={className}>
		<title>Svelte Logo</title>
		<path
			d="M94.1566,22.8189c-10.4-14.8851-30.94-19.2971-45.7914-9.8348L22.2825,29.6078A29.9234,29.9234,0,0,0,8.7639,49.6506a31.5136,31.5136,0,0,0,3.1076,20.2318A30.0061,30.0061,0,0,0,7.3953,81.0653a31.8886,31.8886,0,0,0,5.4473,24.1157c10.4022,14.8865,30.9423,19.2966,45.7914,9.8348L84.7167,98.3921A29.9177,29.9177,0,0,0,98.2353,78.3493,31.5263,31.5263,0,0,0,95.13,58.117a30,30,0,0,0,4.4743-11.1824,31.88,31.88,0,0,0-5.4473-24.1157"
			style={{ fill: "#ff3e00" }}
		/>
		<path
			d="M45.8171,106.5815A20.7182,20.7182,0,0,1,23.58,98.3389a19.1739,19.1739,0,0,1-3.2766-14.5025,18.1886,18.1886,0,0,1,.6233-2.4357l.4912-1.4978,1.3363.9815a33.6443,33.6443,0,0,0,10.203,5.0978l.9694.2941-.0893.9675a5.8474,5.8474,0,0,0,1.052,3.8781,6.2389,6.2389,0,0,0,6.6952,2.485,5.7449,5.7449,0,0,0,1.6021-.7041L69.27,76.281a5.4306,5.4306,0,0,0,2.4506-3.631,5.7948,5.7948,0,0,0-.9875-4.3712,6.2436,6.2436,0,0,0-6.6978-2.4864,5.7427,5.7427,0,0,0-1.6.7036l-9.9532,6.3449a19.0329,19.0329,0,0,1-5.2965,2.3259,20.7181,20.7181,0,0,1-22.2368-8.2427,19.1725,19.1725,0,0,1-3.2766-14.5024,17.9885,17.9885,0,0,1,8.13-12.0513L55.8833,23.7472a19.0038,19.0038,0,0,1,5.3-2.3287A20.7182,20.7182,0,0,1,83.42,29.6611a19.1739,19.1739,0,0,1,3.2766,14.5025,18.4,18.4,0,0,1-.6233,2.4357l-.4912,1.4978-1.3356-.98a33.6175,33.6175,0,0,0-10.2037-5.1l-.9694-.2942.0893-.9675a5.8588,5.8588,0,0,0-1.052-3.878,6.2389,6.2389,0,0,0-6.6952-2.485,5.7449,5.7449,0,0,0-1.6021.7041L37.73,51.719a5.4218,5.4218,0,0,0-2.4487,3.63,5.7862,5.7862,0,0,0,.9856,4.3717,6.2437,6.2437,0,0,0,6.6978,2.4864,5.7652,5.7652,0,0,0,1.602-.7041l9.9519-6.3425a18.978,18.978,0,0,1,5.2959-2.3278,20.7181,20.7181,0,0,1,22.2368,8.2427,19.1725,19.1725,0,0,1,3.2766,14.5024,17.9977,17.9977,0,0,1-8.13,12.0532L51.1167,104.2528a19.0038,19.0038,0,0,1-5.3,2.3287"
			style={{ fill: "#fff" }}
		/>
	</svg>
);

const LitIcon = ({ className }: Icon.Props) => (
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 768 960" width={36} height={36} className={className}>
		<title>Lit Logo</title>
		<path d="M192 576l96-288 432 432-144 240-192-192h-96" fill="#00e8ff" />
		<path d="M384 768V384l192-192v384m-480 0h96l96 192-96 192L0 768z" fill="#283198" fill-rule="evenodd" />
		<path d="M192 576V192L384 0v384m192 576V576l192-192v384M0 768V384l192 192" fill="#324fff" />
		<path d="M192 960V576l192 192" fill="#0ff" />
	</svg>
);

const VanillaIcon = ({ className }: Icon.Props) => (
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 630 630" width={36} height={36} className={className}>
		<title>Vanilla Logo</title>
		<rect width="630" height="630" fill="#f7df1e" />
		<path d="m423.2 492.19c12.69 20.72 29.2 35.95 58.4 35.95 24.53 0 40.2-12.26 40.2-29.2 0-20.3-16.1-27.49-43.1-39.3l-14.8-6.35c-42.72-18.2-71.1-41-71.1-89.2 0-44.4 33.83-78.2 86.7-78.2 37.64 0 64.7 13.1 84.2 47.4l-46.1 29.6c-10.15-18.2-21.1-25.37-38.1-25.37-17.34 0-28.33 11-28.33 25.37 0 17.76 11 24.95 36.4 35.95l14.8 6.34c50.3 21.57 78.7 43.56 78.7 93 0 53.3-41.87 82.5-98.1 82.5-54.98 0-90.5-26.2-107.88-60.54zm-209.13 5.13c9.3 16.5 17.76 30.45 38.1 30.45 19.45 0 31.72-7.61 31.72-37.2v-201.3h59.2v202.1c0 61.3-35.94 89.2-88.4 89.2-47.4 0-74.85-24.53-88.81-54.075z" />
	</svg>
);

const QwikIcon = ({ className }: Icon.Props) => (
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 272" width={36} height={36} className={className}>
		<title>Qwik Logo</title>
		<g>
			<path
				d="M224.802633,271.548066 L176.04373,223.065139 L175.29865,223.17158 L175.29865,222.639928 L71.6062201,120.251664 L97.1567871,95.5849889 L82.1459867,9.46423235 L10.923994,97.7115967 C-1.21249511,109.938494 -3.44814914,129.82085 5.28159772,144.493127 L49.7819901,218.280821 C56.5954198,229.657294 68.9446684,236.461781 82.2524269,236.355341 L104.289921,236.14246 L224.802633,271.548066 Z"
				fill="#18B6F6"
			/>
			<path
				d="M251.41376,96.0096521 L241.619075,77.935132 L236.508852,68.685266 L234.486489,65.0701426 L234.273609,65.2830228 L207.445212,18.8201544 C200.738387,7.12474433 188.176258,-0.105173442 174.549179,4.00642427e-13 L151.021523,0.639029547 L80.8637673,0.851690324 C67.5565576,0.958020713 55.4201892,7.97527771 48.7129802,19.3517514 L6.02242644,103.983883 L82.3544777,9.25113264 L182.427394,119.187811 L164.648054,137.15644 L175.29426,223.171031 L175.4007,222.958151 L175.4007,223.171031 L175.18782,223.171031 L175.4007,223.383362 L183.704676,231.464033 L224.053163,270.909425 C225.756753,272.504381 228.524745,270.590653 227.353355,268.570486 L202.441978,219.555907 L245.877777,139.283048 L247.261498,137.688092 C247.793699,137.05 248.3259,136.412457 248.752209,135.774364 C257.269064,124.18501 258.439906,108.66231 251.41376,96.0096521 Z"
				fill="#AC7EF4"
			/>
			<polygon
				fill="#FFFFFF"
				points="182.745617 118.763148 82.3533804 9.35773736 96.6190999 95.053337 71.0685329 119.826452 175.080283 223.065139 165.711906 137.36932"
			/>
		</g>
	</svg>
);

namespace Icon {
	export type Props = {
		className?: string;
	};
}

export const icons = {
	ReactIcon,
	ShadcnIcon,
	VueIcon,
	AngularIcon,
	SolidIcon,
	SvelteIcon,
	LitIcon,
	VanillaIcon,
	QwikIcon,
};
