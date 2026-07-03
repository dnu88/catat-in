import type { ReactNode } from "react";
import { Html, ScrollViewStyleReset } from "expo-router/build/static/html";

export default function Root({ children }: { children: ReactNode }) {
	return (
		<Html>
			<ScrollViewStyleReset />
			{children}
		</Html>
	);
}
