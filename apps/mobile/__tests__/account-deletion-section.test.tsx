import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { AccountDeletionSection } from "../src/components/settings/AccountDeletionSection";

jest.mock("../src/components/ui", () => ({
  IconBubble: ({ name }: { name: string }) => {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(Text, { testID: `icon-${name}` }, name);
  },
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
  passwordForm: {},
  textInput: {},
  readOnlyInput: {},
  multilineInput: {},
  inlineMessage: {},
  inlineMessageError: {},
  primaryButton: {},
  buttonDisabled: {},
  primaryButtonText: {},
};

describe("AccountDeletionSection", () => {
  it("shows the request CTA and expands the form", () => {
    const onToggleExpanded = jest.fn();

    render(
      <AccountDeletionSection
        language="id"
        styles={styles}
        profileEmail="danu@example.com"
        expanded={false}
        onToggleExpanded={onToggleExpanded}
        request={null}
        reason=""
        details=""
        onChangeReason={jest.fn()}
        onChangeDetails={jest.fn()}
        onSubmit={jest.fn()}
        loading={false}
        loadingStatus={false}
        message={null}
      />,
    );

    expect(screen.getByText("Request Penghapusan Akun")).toBeTruthy();
    expect(screen.getByText(/Target proses maksimal 30 hari/)).toBeTruthy();

    fireEvent.press(screen.getByTestId("settings-account-deletion-toggle"));
    expect(onToggleExpanded).toHaveBeenCalledTimes(1);
  });

  it("shows a submit button and calls submit when the form is expanded", () => {
    const onSubmit = jest.fn();

    render(
      <AccountDeletionSection
        language="en"
        styles={styles}
        profileEmail="danu@example.com"
        expanded={true}
        onToggleExpanded={jest.fn()}
        request={null}
        reason=""
        details=""
        onChangeReason={jest.fn()}
        onChangeDetails={jest.fn()}
        onSubmit={onSubmit}
        loading={false}
        loadingStatus={false}
        message={null}
      />,
    );

    expect(screen.getByTestId("settings-account-deletion-email")).toBeTruthy();
    expect(screen.getByTestId("settings-account-deletion-reason")).toBeTruthy();
    expect(screen.getByTestId("settings-account-deletion-details")).toBeTruthy();
    expect(screen.getByTestId("settings-submit-account-deletion")).toBeTruthy();

    fireEvent.press(screen.getByTestId("settings-submit-account-deletion"));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
