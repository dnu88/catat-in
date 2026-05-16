import { useMemo } from 'react'
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native'

import { KaswiseIcon } from '../components/icons/kaswise-icons'
import { BOTTOM_TABS } from '../data/mock'
import { createMobileStyles } from '../styles/mobileStyles'
import { useTheme } from '../theme/theme-context'
import type { TabKey } from '../types/navigation'
import { BudgetsScreen } from '../screens/tabs/BudgetsScreen'
import { HomeScreen } from '../screens/tabs/HomeScreen'
import { MoreScreen } from '../screens/tabs/MoreScreen'
import { ReportsScreen } from '../screens/tabs/ReportsScreen'
import { TransactionsScreen } from '../screens/tabs/TransactionsScreen'

export function BottomTabShell({
  activeTab,
  onChangeTab,
}: {
  activeTab: TabKey
  onChangeTab: (tab: TabKey) => void
}) {
  const { theme } = useTheme()
  const { width } = useWindowDimensions()
  const styles = useMemo(() => createMobileStyles(theme, width), [theme, width])

  return (
    <View style={styles.appShell}>
      <ScrollView contentContainerStyle={styles.appContent}>
        {activeTab === 'home' ? <HomeScreen /> : null}
        {activeTab === 'transactions' ? <TransactionsScreen /> : null}
        {activeTab === 'budgets' ? <BudgetsScreen /> : null}
        {activeTab === 'reports' ? <ReportsScreen /> : null}
        {activeTab === 'more' ? <MoreScreen /> : null}
      </ScrollView>

      <View style={styles.floatingActionWrap}>
        <Pressable style={styles.floatingActionButton}>
          <KaswiseIcon name="capture" size={24} color={theme.colors.textInverse} weight="bold" />
        </Pressable>
      </View>

      <View style={styles.bottomNav}>
        {BOTTOM_TABS.map((tab) => {
          const active = activeTab === tab.key
          return (
            <Pressable key={tab.key} style={styles.bottomNavItem} onPress={() => onChangeTab(tab.key)}>
              <View style={[styles.bottomNavIcon, active ? styles.bottomNavIconActive : null]}>
                <KaswiseIcon
                  name={tab.icon}
                  size={22}
                  color={active ? theme.colors.brandPrimary : theme.colors.textMuted}
                  weight={active ? 'fill' : 'regular'}
                />
              </View>
              <Text style={[styles.bottomNavLabel, active ? styles.bottomNavLabelActive : null]}>
                {tab.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
