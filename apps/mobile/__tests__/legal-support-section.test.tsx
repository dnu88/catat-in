import { fireEvent, render } from "@testing-library/react-native";

import { LegalSupportSection } from "../src/components/settings/LegalSupportSection";
import { KASWISE_LEGAL_URLS } from "../src/config/legal-links";

jest.mock("../src/components/ui", () => ({
  IconBubble: () => null,
}));

const styles = {
  sectionCard: {},
  sectionTitle: {},
  sectionSub: {},
  navigationRow: {},
  navigationCopy: {},
  navigationTextBlock: {},
  navigationTitle: {},
  navigationHelper: {},
  navigationChevron: {},
};

describe("LegalSupportSection", () => {
  it("renders privacy, deletion, and terms rows in Indonesian", () => {
    const onOpenUrl = jest.fn();
    const screen = render(
      <LegalSupportSection language="id" styles={styles} onOpenUrl={onOpenUrl} />,
    );

    expect(screen.getByText("Legal & Dukungan")).toBeTruthy();
    expect(screen.getByText("Kebijakan Privasi")).toBeTruthy();
    expect(screen.getByText("Penghapusan Akun")).toBeTruthy();
    expect(screen.getByText("Syarat Layanan")).toBeTruthy();
  });

  it("opens public production URLs when rows are pressed", () => {
    const onOpenUrl = jest.fn();
    const screen = render(
      <LegalSupportSection language="id" styles={styles} onOpenUrl={onOpenUrl} />,
    );

    fireEvent.press(screen.getByTestId("settings-privacy-policy"));
    fireEvent.press(screen.getByTestId("settings-account-deletion"));
    fireEvent.press(screen.getByTestId("settings-terms-of-service"));

    expect(onOpenUrl).toHaveBeenNthCalledWith(1, KASWISE_LEGAL_URLS.privacy);
    expect(onOpenUrl).toHaveBeenNthCalledWith(2, KASWISE_LEGAL_URLS.accountDeletion);
    expect(onOpenUrl).toHaveBeenNthCalledWith(3, KASWISE_LEGAL_URLS.terms);
  });
});
