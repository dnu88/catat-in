import Svg, { Defs, LinearGradient, Polygon, Stop } from "react-native-svg";

import { kaswiseLogoPalette } from "../../theme/report-palettes";

export function KaswiseLogoMark({
	size = 52,
	testID = "kaswise-logo-mark",
}: {
	size?: number;
	testID?: string;
}) {
	return (
		<Svg
			testID={testID}
			accessibilityLabel="Kaswise logo"
			width={size * 1.3}
			height={size}
			viewBox="0 0 130 100"
		>
			<Defs>
				<LinearGradient id="ks-g1" x1="0" y1="0" x2="1" y2="1">
					<Stop offset="0%" stopColor={kaswiseLogoPalette.graphiteStart} />
					<Stop offset="100%" stopColor={kaswiseLogoPalette.graphiteEnd} />
				</LinearGradient>
				<LinearGradient id="ks-g2" x1="0" y1="1" x2="1" y2="0">
					<Stop offset="0%" stopColor={kaswiseLogoPalette.mistStart} />
					<Stop offset="100%" stopColor={kaswiseLogoPalette.mistEnd} />
				</LinearGradient>
				<LinearGradient id="ks-g3" x1="0" y1="0" x2="1" y2="1">
					<Stop offset="0%" stopColor={kaswiseLogoPalette.forestStart} />
					<Stop offset="100%" stopColor={kaswiseLogoPalette.forestEnd} />
				</LinearGradient>
				<LinearGradient id="ks-g4" x1="0" y1="1" x2="1" y2="0">
					<Stop offset="0%" stopColor={kaswiseLogoPalette.emeraldStart} />
					<Stop offset="100%" stopColor={kaswiseLogoPalette.emeraldEnd} />
				</LinearGradient>
			</Defs>
			<Polygon
				testID="kaswise-logo-polygon-1"
				accessibilityLabel="15,35 35,85 50,85 30,35"
				points="15,35 35,85 50,85 30,35"
				fill="url(#ks-g1)"
			/>
			<Polygon
				testID="kaswise-logo-polygon-2"
				accessibilityLabel="35,85 60,35 75,35 50,85"
				points="35,85 60,35 75,35 50,85"
				fill="url(#ks-g2)"
			/>
			<Polygon
				testID="kaswise-logo-polygon-3"
				accessibilityLabel="60,35 75,85 90,85 75,35"
				points="60,35 75,85 90,85 75,35"
				fill="url(#ks-g3)"
			/>
			<Polygon
				testID="kaswise-logo-polygon-4"
				accessibilityLabel="75,85 90,85 106,45 118,50 112,10 80,30 91,45"
				points="75,85 90,85 106,45 118,50 112,10 80,30 91,45"
				fill="url(#ks-g4)"
			/>
		</Svg>
	);
}
