import { Pressable, ScrollView, Text, View } from 'react-native'

import { BOTTOM_TABS } from '../data/mock'
import { styles } from '../styles/mobileStyles'
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
          <Text style={styles.floatingActionText}>+</Text>
        </Pressable>
      </View>

      <View style={styles.bottomNav}>
        {BOTTOM_TABS.map((tab) => {
          const active = activeTab === tab.key
          return (
            <Pressable key={tab.key} style={styles.bottomNavItem} onPress={() => onChangeTab(tab.key)}>
              <View style={[styles.bottomNavIcon, active ? styles.bottomNavIconActive : null]}>
                <Text style={[styles.bottomNavIconText, active ? styles.bottomNavIconTextActive : null]}>
                  {tab.icon}
                </Text>
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
