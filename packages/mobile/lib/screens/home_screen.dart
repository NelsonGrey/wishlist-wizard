import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/models.dart';
import '../providers/providers.dart';
import '../main.dart';
import '../widgets/admob_widgets.dart';
import 'firebase_wishlists_screen.dart';
import 'notifications_screen.dart';
import 'scan_item_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      if (auth.user != null) {
        Provider.of<FirebaseWishlistProvider>(
          context,
          listen: false,
        ).loadWishlists(auth.user!.id);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomAppBar(
        title: 'Home',
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            tooltip: 'Notifications',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const NotificationsScreen()),
            ),
          ),
        ],
      ),
      body: Consumer2<AuthProvider, FirebaseWishlistProvider>(
        builder: (context, authProvider, wishlistProvider, child) {
          final user = authProvider.user;

          return RefreshIndicator(
            onRefresh: () async {
              if (user != null) {
                await wishlistProvider.loadWishlists(user.id);
              }
            },
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildWelcomeSection(
                    context,
                    user?.name ?? user?.email ?? 'User',
                  ),
                  const SizedBox(height: 24),
                  _buildQuickStats(context, wishlistProvider.wishlists),
                  const SizedBox(height: 24),
                  _buildRecentWishlists(context, wishlistProvider),
                  const SizedBox(height: 24),
                  _buildQuickActions(context),
                  const SizedBox(height: 16),
                  Consumer<SubscriptionProvider>(
                    builder: (context, sub, _) {
                      if (sub.tier == 'free') {
                        return const AdContainer(
                          label: 'Advertisement',
                          child: BannerAdWidget(),
                        );
                      }
                      return const SizedBox.shrink();
                    },
                  ),
                ],
              ),
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showCreateWishlistDialog(context),
        backgroundColor: Theme.of(context).primaryColor,
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildWelcomeSection(BuildContext context, String userName) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Theme.of(context).primaryColor, Theme.of(context).hintColor],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Welcome back,',
            style: Theme.of(
              context,
            ).textTheme.bodyLarge?.copyWith(color: Colors.white70),
          ),
          const SizedBox(height: 4),
          Text(
            userName,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Manage your wishlists and discover new items',
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: Colors.white70),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickStats(
    BuildContext context,
    List<FirebaseWishlist> wishlists,
  ) {
    return Row(
      children: [
        Expanded(
          child: _buildStatCard(
            context,
            icon: Icons.list_alt,
            label: 'Wishlists',
            value: wishlists.length.toString(),
            color: Colors.blue,
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: _buildStatCard(
            context,
            icon: Icons.public,
            label: 'Shared',
            value: wishlists.where((w) => w.isPublic).length.toString(),
            color: Colors.green,
          ),
        ),
      ],
    );
  }

  Widget _buildStatCard(
    BuildContext context, {
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(icon, color: color, size: 32),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                color: color,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: Theme.of(
                context,
              ).textTheme.bodySmall?.copyWith(color: Colors.grey[600]),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRecentWishlists(
    BuildContext context,
    FirebaseWishlistProvider provider,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Recent Wishlists',
          style: Theme.of(
            context,
          ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        if (provider.isLoading)
          const Center(child: CircularProgressIndicator())
        else if (provider.error != null)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                provider.error!,
                style: const TextStyle(color: Colors.red),
                textAlign: TextAlign.center,
              ),
            ),
          )
        else if (provider.wishlists.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  Icon(
                    Icons.list_alt_outlined,
                    size: 64,
                    color: Colors.grey[400],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No wishlists yet',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Create your first wishlist to get started',
                    style: Theme.of(
                      context,
                    ).textTheme.bodyMedium?.copyWith(color: Colors.grey[600]),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount:
                provider.wishlists.length > 3 ? 3 : provider.wishlists.length,
            itemBuilder: (context, index) {
              final wishlist = provider.wishlists[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: Theme.of(
                      context,
                    ).primaryColor.withValues(alpha: 0.1),
                    child: Icon(
                      wishlist.isPublic ? Icons.public : Icons.lock_outline,
                      color: Theme.of(context).primaryColor,
                    ),
                  ),
                  title: Text(wishlist.name),
                  subtitle: wishlist.description != null &&
                          wishlist.description!.isNotEmpty
                      ? Text(
                          wishlist.description!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(color: Colors.grey[600]),
                        )
                      : null,
                  trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) =>
                            FirebaseWishlistItemsScreen(wishlist: wishlist),
                      ),
                    );
                  },
                ),
              );
            },
          ),
      ],
    );
  }

  Widget _buildQuickActions(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Quick Actions',
          style: Theme.of(
            context,
          ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildActionCard(
                context,
                icon: Icons.camera_alt,
                label: 'Scan Item',
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const ScanItemScreen(),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildActionCard(
                context,
                icon: Icons.search,
                label: 'Browse',
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const BrowseScreen(),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildActionCard(
    BuildContext context, {
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              Icon(icon, size: 32, color: Theme.of(context).primaryColor),
              const SizedBox(height: 8),
              Text(
                label,
                style: Theme.of(
                  context,
                ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w500),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showCreateWishlistDialog(BuildContext context) {
    final nameController = TextEditingController();
    final descriptionController = TextEditingController();

    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Create New Wishlist'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameController,
              decoration: const InputDecoration(
                labelText: 'Wishlist Name',
                hintText: 'My Birthday Wishlist',
              ),
              autofocus: true,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: descriptionController,
              decoration: const InputDecoration(
                labelText: 'Description (optional)',
                hintText: 'Items I want for my birthday',
              ),
              maxLines: 2,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (nameController.text.trim().isEmpty) return;

              final auth = Provider.of<AuthProvider>(context, listen: false);
              if (auth.user == null) return;

              final success = await Provider.of<FirebaseWishlistProvider>(
                context,
                listen: false,
              ).createWishlist(
                name: nameController.text.trim(),
                userId: auth.user!.id,
                description: descriptionController.text.trim().isEmpty
                    ? null
                    : descriptionController.text.trim(),
              );

              if (dialogContext.mounted) {
                Navigator.pop(dialogContext);
              }
              if (success && context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Wishlist created!')),
                );
              }
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }
}

class BrowseScreen extends StatelessWidget {
  const BrowseScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Browse Products')),
      body: const Center(child: Text('Browse Products Screen')),
    );
  }
}
