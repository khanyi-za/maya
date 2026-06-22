import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useAddresses } from '@/hooks/useCheckoutQueries';
import { useAuthStore } from '@/lib/auth-store';
import { logout } from '@/lib/auth';
import type { Address } from '@/lib/api-client';

/**
 * Signed-in account hub (reached from the SideMenu "Account" link). v1 scope:
 * profile identity + a read-only view of saved delivery addresses + sign out.
 * Address management and order history live elsewhere — adding/changing an
 * address happens in checkout, and "My orders" is pending its backend list
 * endpoint. Guests see a sign-in prompt (matching cart/wishlist).
 */
export default function AccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const authState = useAuthStore((s) => s.state);
  const addressesQuery = useAddresses();

  const handleSignOut = async () => {
    await logout();
    router.replace('/(tabs)');
  };

  const renderBody = () => {
    if (authState.status === 'loading') {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#333" />
        </View>
      );
    }

    if (authState.status === 'guest') {
      return (
        <View style={styles.centered}>
          <View style={styles.guestIcon}>
            <IconSymbol name="person.crop.circle" size={44} color="#ccc" />
          </View>
          <Text style={styles.guestTitle}>Sign in to your account</Text>
          <Text style={styles.guestSubtitle}>
            Manage your profile, addresses, and orders
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const user = authState.user;
    const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
      .trim()
      .toUpperCase();

    return (
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* Profile */}
        <View style={styles.profileCard}>
          {user.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitials}>{initials || '·'}</Text>
            </View>
          )}
          <View style={styles.profileText}>
            <Text style={styles.profileName} numberOfLines={1}>
              {user.firstName} {user.lastName}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {user.email}
            </Text>
          </View>
        </View>

        {/* Delivery addresses (view-only) */}
        <Text style={styles.sectionTitle}>Delivery addresses</Text>
        <View style={styles.section}>
          {renderAddresses(addressesQuery)}
        </View>
        <Text style={styles.sectionHint}>
          You can add or change addresses during checkout.
        </Text>

        {/* Orders */}
        <Text style={styles.sectionTitle}>My orders</Text>
        <TouchableOpacity
          style={[styles.section, styles.rowBetween]}
          onPress={() => router.push('/orders')}
          activeOpacity={0.7}
        >
          <Text style={styles.rowLabel}>Order history</Text>
          <Text style={styles.rowChevron}>›</Text>
        </TouchableOpacity>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account</Text>
        <View style={styles.headerSpacer} />
      </View>

      {renderBody()}
    </View>
  );
}

function renderAddresses(query: ReturnType<typeof useAddresses>) {
  if (query.isPending) {
    return <ActivityIndicator color="#333" style={styles.inlineLoader} />;
  }
  if (query.isError) {
    return (
      <View style={styles.inlineState}>
        <Text style={styles.inlineStateText}>Couldn&apos;t load your addresses.</Text>
        <TouchableOpacity onPress={() => query.refetch()}>
          <Text style={styles.retryLink}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const addresses = query.data?.addresses ?? [];
  if (addresses.length === 0) {
    return (
      <Text style={styles.emptyAddressText}>
        No saved addresses yet — add one when you check out.
      </Text>
    );
  }

  return addresses.map((address: Address, index: number) => (
    <View
      key={address.id}
      style={[styles.addressRow, index > 0 && styles.addressRowDivider]}
    >
      <View style={styles.addressTextBlock}>
        <Text style={styles.addressLabel}>
          {address.label || address.recipientName}
        </Text>
        <Text style={styles.addressLine} numberOfLines={2}>
          {[address.line1, address.line2, address.city, address.province, address.postalCode]
            .filter(Boolean)
            .join(', ')}
        </Text>
      </View>
      {address.isDefault && (
        <View style={styles.defaultPill}>
          <Text style={styles.defaultPillText}>Default</Text>
        </View>
      )}
    </View>
  ));
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backText: {
    fontSize: 26,
    color: '#000',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  guestIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  guestTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  guestSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarFallback: {
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  section: {
    marginHorizontal: 20,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  sectionHint: {
    fontSize: 13,
    color: '#999',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  rowLabel: {
    fontSize: 16,
    color: '#000',
  },
  rowChevron: {
    fontSize: 22,
    color: '#ccc',
    fontWeight: '300',
  },
  inlineLoader: {
    paddingVertical: 20,
  },
  inlineState: {
    paddingVertical: 16,
    gap: 8,
  },
  inlineStateText: {
    fontSize: 14,
    color: '#666',
  },
  retryLink: {
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  emptyAddressText: {
    fontSize: 14,
    color: '#666',
    paddingVertical: 16,
    lineHeight: 20,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    gap: 12,
  },
  addressRowDivider: {
    borderTopWidth: 1,
    borderTopColor: '#ececec',
  },
  addressTextBlock: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  addressLine: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  defaultPill: {
    backgroundColor: '#e8f6ee',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  defaultPillText: {
    fontSize: 12,
    color: '#1c7c44',
    fontWeight: '600',
  },
  signOutButton: {
    marginHorizontal: 20,
    marginTop: 28,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#b3261e',
  },
});
