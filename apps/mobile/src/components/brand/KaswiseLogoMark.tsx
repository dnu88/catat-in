import Svg, { Defs, LinearGradient, Polygon, Stop } from "react-native-svg";

import { kaswiseLogoPalette } from "../../theme/report-palettes";

export function KaswiseLogoMark({
	size = 52,
	testID = "kaswise-logo-mark",
	onDark = false,
}: {
	size?: number;
	testID?: string;
	/**
	 * Varian untuk permukaan gelap (mis. kartu wallet stack navy). Palette asli
	 * memakai graphite/mist/navy yang kontrasnya <3:1 di atas navy, sehingga
	 * mark praktis tidak terbaca.
	 */
	onDark?: boolean;
}) {
	const tone = onDark
		? {
				g1a: "#FFFFFF",
				g1b: "#E4EDF8",
				g2a: "#FFFFFF",
				g2b: "#D7E6F5",
				g3a: "#F2F7FD",
				g3b: "#BBD4EC",
				g4a: "#FFFFFF",
				g4b: "#A9C8E6",
			}
		: {
				g1a: kaswiseLogoPalette.graphiteStart,
				g1b: kaswiseLogoPalette.graphiteEnd,
				g2a: kaswiseLogoPalette.mistStart,
				g2b: kaswiseLogoPalette.mistEnd,
				g3a: kaswiseLogoPalette.navyStart,
				g3b: kaswiseLogoPalette.navyEnd,
				g4a: kaswiseLogoPalette.blueStart,
				g4b: kaswiseLogoPalette.blueEnd,
			};
	return (
		<Svg
			testID={testID}
			accessible
			accessibilityRole="image"
			accessibilityLabel="Kaswise logo"
			width={size * 1.3}
			height={size}
			viewBox="0 0 130 100"
		>
			<Defs>
				<LinearGradient id="ks-g1" x1="0" y1="0" x2="1" y2="1">
					<Stop offset="0%" stopColor={tone.g1a} />
					<Stop offset="100%" stopColor={tone.g1b} />
				</LinearGradient>
				<LinearGradient id="ks-g2" x1="0" y1="1" x2="1" y2="0">
					<Stop offset="0%" stopColor={tone.g2a} />
					<Stop offset="100%" stopColor={tone.g2b} />
				</LinearGradient>
				<LinearGradient id="ks-g3" x1="0" y1="0" x2="1" y2="1">
					<Stop offset="0%" stopColor={tone.g3a} />
					<Stop offset="100%" stopColor={tone.g3b} />
				</LinearGradient>
				<LinearGradient id="ks-g4" x1="0" y1="1" x2="1" y2="0">
					<Stop offset="0%" stopColor={tone.g4a} />
					<Stop offset="100%" stopColor={tone.g4b} />
				</LinearGradient>
			</Defs>
			<Polygon
				testID="kaswise-logo-polygon-1"
				points="15,35 35,85 50,85 30,35"
				fill="url(#ks-g1)"
			/>
			<Polygon
				testID="kaswise-logo-polygon-2"
				points="35,85 60,35 75,35 50,85"
				fill="url(#ks-g2)"
			/>
			<Polygon
				testID="kaswise-logo-polygon-3"
				points="60,35 75,85 90,85 75,35"
				fill="url(#ks-g3)"
			/>
			<Polygon
				testID="kaswise-logo-polygon-4"
				points="75,85 90,85 106,45 118,50 112,10 80,30 91,45"
				fill="url(#ks-g4)"
			/>
		</Svg>
	);
}
