import { render, screen } from "@testing-library/react-native";
import ImportsScreen from "../app/(tabs)/imports";

jest.mock("expo-router", () => ({
  Redirect: ({ href }: { href: string }) => {
    const { View } = require("react-native");
    return <View testID={`redirect-${href}`} />;
  },
}));

describe("imports screen", () => {
  it("redirects hidden import route to capture for Track A reviewer-safe builds", () => {
    render(<ImportsScreen />);
    expect(screen.getByTestId("redirect-/(tabs)/capture")).toBeTruthy();
  });
});
