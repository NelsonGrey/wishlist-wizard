import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/providers.dart';
import '../services/firebase_functions_service.dart';
import '../theme/design_tokens.dart';
import '../widgets/app_scaffold.dart';
import 'account_screen.dart';
import 'achievements_screen.dart';
import 'calendar_screen.dart';
import 'connections_screen.dart';
import 'creator_dashboard_screen.dart';
import 'price_tracking_screen.dart';
import 'subscription_screen.dart';

/// The Profile tab: an identity header followed by grouped setting cards, in the
/// style of vehicle-vitals' account screen. Every row keeps its original
/// Navigator.push target.
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  void _open(BuildContext context, Widget screen) {
    Navigator.push(context, MaterialPageRoute(builder: (_) => screen));
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Profile',
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.x4,
          AppSpacing.x5,
          AppSpacing.x4,
          AppSpacing.x8,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const _IdentityHeader(),
            const SizedBox(height: AppSpacing.x6),
            _MenuCard(
              label: 'Your Wizard',
              tiles: [
                _MenuTile(
                  icon: Icons.emoji_events_outlined,
                  title: 'Achievements',
                  subtitle: 'Badges and progress',
                  onTap: () => _open(context, const AchievementsScreen()),
                ),
                _MenuTile(
                  icon: Icons.trending_down_outlined,
                  title: 'Price Tracking',
                  subtitle: 'Alerts and recent drops',
                  onTap: () => _open(context, const PriceTrackingScreen()),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.x4),
            _MenuCard(
              label: 'Social',
              tiles: [
                _MenuTile(
                  icon: Icons.people_outline,
                  title: 'Connections',
                  subtitle: 'Friends you share wishlists with',
                  onTap: () => _open(context, const ConnectionsScreen()),
                ),
                _MenuTile(
                  icon: Icons.calendar_today_outlined,
                  title: 'Calendar',
                  subtitle: 'Gift dates and reminders',
                  onTap: () => _open(context, const CalendarScreen()),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.x4),
            _MenuCard(
              label: 'Selling',
              tiles: [
                _MenuTile(
                  icon: Icons.storefront_outlined,
                  title: 'Creator Tools',
                  subtitle: 'Performance, commissions, and payouts',
                  onTap: () => _open(context, const CreatorDashboardScreen()),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.x4),
            _MenuCard(
              label: 'Account',
              tiles: [
                _MenuTile(
                  icon: Icons.workspace_premium_outlined,
                  title: 'Manage Subscription',
                  subtitle: 'Plan, billing, and upgrades',
                  onTap: () => _open(context, const SubscriptionScreen()),
                ),
                _MenuTile(
                  icon: Icons.security_outlined,
                  title: 'Account & Security',
                  subtitle: 'Sign-in methods and password',
                  onTap: () => _open(context, const AccountScreen()),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.x6),
            ElevatedButton.icon(
              onPressed: () =>
                  Provider.of<AuthProvider>(context, listen: false).logout(),
              icon: const Icon(Icons.logout),
              label: const Text('Logout'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Theme.of(context).colorScheme.error,
                foregroundColor: Theme.of(context).colorScheme.onError,
              ),
            ),
            const SizedBox(height: AppSpacing.x2),
            TextButton(
              onPressed: () => _showDeleteAccountDialog(context),
              style: TextButton.styleFrom(
                foregroundColor: Theme.of(context).colorScheme.error,
              ),
              child: const Text('Delete Account'),
            ),
          ],
        ),
      ),
    );
  }

  void _showDeleteAccountDialog(BuildContext context) {
    final confirmController = TextEditingController();
    var deleting = false;

    showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (dialogContext, setDialogState) {
          final confirmed =
              confirmController.text.trim().toLowerCase() ==
              'delete my account';

          return AlertDialog(
            title: const Text('Delete Your Account?'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'This action cannot be undone. All your wishlists, preferences, and data will be permanently deleted.',
                ),
                const SizedBox(height: 16),
                const Text('Please type "delete my account" to confirm:'),
                const SizedBox(height: 8),
                TextField(
                  controller: confirmController,
                  autofocus: true,
                  enabled: !deleting,
                  decoration: const InputDecoration(
                    hintText: 'delete my account',
                  ),
                  onChanged: (_) => setDialogState(() {}),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: deleting ? null : () => Navigator.pop(dialogContext),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Theme.of(dialogContext).colorScheme.error,
                  foregroundColor: Theme.of(dialogContext).colorScheme.onError,
                ),
                onPressed: !confirmed || deleting
                    ? null
                    : () async {
                        setDialogState(() => deleting = true);
                        try {
                          await FirebaseFunctionsService().deleteAccount();
                          if (dialogContext.mounted) {
                            Navigator.pop(dialogContext);
                          }
                          if (context.mounted) {
                            Provider.of<AuthProvider>(
                              context,
                              listen: false,
                            ).logout();
                          }
                        } catch (e) {
                          setDialogState(() => deleting = false);
                          if (dialogContext.mounted) {
                            ScaffoldMessenger.of(dialogContext).showSnackBar(
                              const SnackBar(
                                content: Text(
                                  'Failed to delete account. Please try again.',
                                ),
                              ),
                            );
                          }
                        }
                      },
                child: Text(deleting ? 'Deleting...' : 'Delete Account'),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _IdentityHeader extends StatelessWidget {
  const _IdentityHeader();

  String _initials(String? name, String? email) {
    final source = (name?.trim().isNotEmpty ?? false)
        ? name!.trim()
        : (email ?? '').split('@').first;
    final parts = source.split(RegExp(r'[\s._-]+')).where((p) => p.isNotEmpty);
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return (parts.first.substring(0, 1) + parts.last.substring(0, 1))
        .toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Consumer2<AuthProvider, SubscriptionProvider>(
      builder: (context, auth, sub, _) {
        final user = auth.user;
        final name = user?.name;
        final email = user?.email;
        final hasPhoto = user?.profileImageUrl != null;
        final tierLabel = sub.tier == 'free'
            ? 'Free plan'
            : '${sub.tier[0].toUpperCase()}${sub.tier.substring(1)} plan';

        return Row(
          children: [
            CircleAvatar(
              radius: 36,
              backgroundColor: AppColors.primary,
              foregroundImage:
                  hasPhoto ? NetworkImage(user!.profileImageUrl!) : null,
              child: Text(
                _initials(user?.name, user?.email),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(width: AppSpacing.x4),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name ?? email ?? 'Unknown User',
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (name != null && email != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      email,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: AppColors.mutedForeground,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  const SizedBox(height: AppSpacing.x2),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.x3,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.ivory,
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(color: AppColors.gold),
                    ),
                    child: Text(
                      tierLabel,
                      style: theme.textTheme.labelMedium?.copyWith(
                        color: AppColors.emerald,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}

class _MenuCard extends StatelessWidget {
  const _MenuCard({required this.label, required this.tiles});

  final String label;
  final List<Widget> tiles;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(
            left: AppSpacing.x1,
            bottom: AppSpacing.x2,
          ),
          child: Text(
            label.toUpperCase(),
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: AppColors.mutedForeground,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.8,
            ),
          ),
        ),
        Card(
          child: Column(
            children: [
              for (var i = 0; i < tiles.length; i++) ...[
                if (i > 0) const Divider(height: 1),
                tiles[i],
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _MenuTile extends StatelessWidget {
  const _MenuTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: AppColors.emerald),
      title: Text(title),
      subtitle: Text(
        subtitle,
        style: const TextStyle(color: AppColors.mutedForeground),
      ),
      trailing: const Icon(
        Icons.chevron_right,
        color: AppColors.mutedForeground,
      ),
      onTap: onTap,
    );
  }
}
