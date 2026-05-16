import { useMemo, useState } from 'react'
import { SafeAreaView, ScrollView } from 'react-native'

import { BottomTabShell } from './BottomTabShell'
import { SplashScreen } from '../screens/onboarding/SplashScreen'
import { AiIntroScreen } from '../screens/onboarding/AiIntroScreen'
import { SetupAccountScreen } from '../screens/onboarding/SetupAccountScreen'
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen'
import { createMobileStyles } from '../styles/mobileStyles'
import { useTheme } from '../theme/theme-context'
import type { OnboardingStep, TabKey } from '../types/navigation'

export function MobileRoot() {
  const { theme } = useTheme()
  const styles = useMemo(() => createMobileStyles(theme), [theme])
  const [step, setStep] = useState<OnboardingStep>(0)
  const [onboardingDone, setOnboardingDone] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('home')

  const goNext = () =>
    setStep((current: OnboardingStep) =>
      current < 3 ? ((current + 1) as OnboardingStep) : current,
    )
  const goPrev = () =>
    setStep((current: OnboardingStep) =>
      current > 0 ? ((current - 1) as OnboardingStep) : current,
    )
  const skipToEnd = () => setStep(3)

  const restart = () => {
    setOnboardingDone(false)
    setStep(0)
    setActiveTab('home')
  }

  const enterApp = () => {
    setOnboardingDone(true)
    setActiveTab('home')
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {!onboardingDone ? (
        step === 0 ? (
          <SplashScreen onPrimary={goNext} onSecondary={skipToEnd} />
        ) : (
          <ScrollView contentContainerStyle={styles.container}>
            {step === 1 ? <AiIntroScreen onNext={goNext} onBack={goPrev} onSkip={skipToEnd} /> : null}
            {step === 2 ? <SetupAccountScreen onNext={goNext} onBack={goPrev} /> : null}
            {step === 3 ? <WelcomeScreen onRestart={restart} onEnterApp={enterApp} /> : null}
          </ScrollView>
        )
      ) : (
        <BottomTabShell activeTab={activeTab} onChangeTab={setActiveTab} />
      )}
    </SafeAreaView>
  )
}
