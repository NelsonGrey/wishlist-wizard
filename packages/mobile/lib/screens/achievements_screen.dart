import 'package:flutter/material.dart';

import '../models/achievements.dart';
import '../services/firebase_functions_service.dart';
import '../widgets/app_scaffold.dart';

/// Trophy case + progress guide for every achievement, computed server-side
/// from real usage data (see packages/functions/src/api/achievements.ts) --
/// mirrors web's AchievementsGuide.tsx. Reached from the Profile tab.
class AchievementsScreen extends StatefulWidget {
  const AchievementsScreen({super.key, FirebaseFunctionsService? functionsService})
      : _functionsService = functionsService;

  // Injectable for tests; defaults to the real Firebase-backed singleton.
  final FirebaseFunctionsService? _functionsService;

  @override
  State<AchievementsScreen> createState() => _AchievementsScreenState();
}

class _AchievementsScreenState extends State<AchievementsScreen> {
  late final FirebaseFunctionsService _service =
      widget._functionsService ?? FirebaseFunctionsService();

  bool _isLoading = true;
  String? _loadError;
  Map<String, dynamic> _achievements = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _isLoading = true;
      _loadError = null;
    });
    try {
      final result = await _service.getAchievements();
      if (!mounted) return;
      setState(() {
        _achievements = Map<String, dynamic>.from(result['achievements'] as Map? ?? {});
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadError = 'Failed to load achievements.';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Achievements',
      body: RefreshIndicator(
        onRefresh: _load,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _loadError != null
                ? ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: [
                      const SizedBox(height: 80),
                      Center(child: Text(_loadError!, style: const TextStyle(color: Colors.red))),
                    ],
                  )
                : ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    children: achievementDefinitions.map(_buildAchievementCard).toList(),
                  ),
      ),
    );
  }

  Widget _buildAchievementCard(AchievementDefinition achievement) {
    final state = _achievements[achievement.id] as Map<String, dynamic>?;
    final earned = state?['earned'] == true;
    final tier = (state?['tier'] as num?)?.toInt() ?? 0;
    final count = (state?['count'] as num?)?.toInt() ?? 0;
    // achievement.tiered gates this, not just tier > 0: a one-time
    // achievement's AchievementState also sets tier: 1 once earned (see
    // achievements.ts's oneTime() helper), which without this check would
    // render a nonsensical "Apprentice" tier badge (achievementTierNames[0])
    // on a plain one-time achievement like Welcome Aboard instead of the
    // intended checkmark -- found via a real integration test asserting
    // the checkmark actually renders after signing up.
    final tierName = achievement.tiered && tier > 0 ? achievementTierNames[tier - 1] : null;
    final isWizard = achievement.tiered && tier == wizardTier;
    final int? nextThreshold = (achievement.tiered && tier < 5 && achievement.thresholds != null)
        ? achievement.thresholds![tier]
        : null;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      color: isWizard ? Colors.amber.shade50 : null,
      shape: isWizard
          ? RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: Colors.amber.shade300),
            )
          : null,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(isWizard ? '🧙' : achievement.icon, style: const TextStyle(fontSize: 28)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          achievement.name,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                        ),
                      ),
                      const SizedBox(width: 8),
                      if (earned && tierName == null)
                        const Icon(Icons.check_circle, size: 16, color: Colors.green)
                      else if (tierName != null)
                        _buildTierBadge(tierName, tier, isWizard),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    achievement.description,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey[600]),
                  ),
                  if (achievement.tiered) ...[
                    const SizedBox(height: 4),
                    Text(
                      nextThreshold != null
                          ? '$count / $nextThreshold toward ${achievementTierNames[tier]}'
                          : '$count — Wizard tier reached',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey[500]),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTierBadge(String tierName, int tier, bool isWizard) {
    const tierColors = [
      Colors.grey,
      Colors.teal,
      Colors.blue,
      Colors.indigo,
      Colors.amber,
    ];
    final color = tierColors[(tier - 1).clamp(0, tierColors.length - 1)];
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.shade100,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.shade300),
      ),
      child: Text(
        isWizard ? '✨ $tierName' : tierName,
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color.shade700),
      ),
    );
  }
}
