import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../providers/providers.dart';

/// Screen for adding wishlist items via camera or URL entry.
///
/// Uses image_picker for photo capture (avoids the GTMSessionFetcher version
/// conflict that prevents mobile_scanner from coexisting with Firebase 12.x).
class ScanItemScreen extends StatefulWidget {
  const ScanItemScreen({super.key});

  @override
  State<ScanItemScreen> createState() => _ScanItemScreenState();
}

class _ScanItemScreenState extends State<ScanItemScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _urlCtrl = TextEditingController();
  final _priceCtrl = TextEditingController();
  final _descCtrl = TextEditingController();

  String? _selectedWishlistId;
  bool _submitting = false;
  XFile? _photo;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _urlCtrl.dispose();
    _priceCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickPhoto(ImageSource source) async {
    final picker = ImagePicker();
    final file = await picker.pickImage(source: source, imageQuality: 85);
    if (file != null && mounted) {
      setState(() => _photo = file);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedWishlistId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a wishlist')),
      );
      return;
    }

    setState(() => _submitting = true);

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final provider = Provider.of<FirebaseWishlistProvider>(
      context,
      listen: false,
    );

    final success = await provider.addWishlistItem(
      name: _nameCtrl.text.trim(),
      wishlistId: _selectedWishlistId!,
      userId: auth.user!.id,
      description: _descCtrl.text.trim().isEmpty
          ? null
          : _descCtrl.text.trim(),
      price: double.tryParse(
        _priceCtrl.text.replaceAll(RegExp(r'[^\d.]'), ''),
      ),
      url: _urlCtrl.text.trim().isEmpty ? null : _urlCtrl.text.trim(),
    );

    if (!mounted) return;
    setState(() => _submitting = false);

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Item added to wishlist!')),
      );
      Navigator.pop(context);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(provider.error ?? 'Failed to add item'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final wishlists =
        Provider.of<FirebaseWishlistProvider>(context).wishlists;

    return Scaffold(
      appBar: AppBar(title: const Text('Add Item')),
      body: SingleChildScrollView(
        padding: EdgeInsets.fromLTRB(
          20,
          20,
          20,
          20 + MediaQuery.of(context).viewInsets.bottom,
        ),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Photo capture section
              _PhotoSection(
                photo: _photo,
                onCamera: () => _pickPhoto(ImageSource.camera),
                onGallery: () => _pickPhoto(ImageSource.gallery),
              ),
              const SizedBox(height: 20),
              // Item name
              TextFormField(
                controller: _nameCtrl,
                decoration: const InputDecoration(
                  labelText: 'Item Name *',
                  hintText: 'e.g. Sony WH-1000XM5',
                  prefixIcon: Icon(Icons.shopping_bag_outlined),
                ),
                validator: (v) => (v == null || v.trim().isEmpty)
                    ? 'Name is required'
                    : null,
                textCapitalization: TextCapitalization.words,
              ),
              const SizedBox(height: 12),
              // Product URL
              TextFormField(
                controller: _urlCtrl,
                decoration: const InputDecoration(
                  labelText: 'Product URL',
                  hintText: 'https://...',
                  prefixIcon: Icon(Icons.link),
                ),
                keyboardType: TextInputType.url,
                autocorrect: false,
              ),
              const SizedBox(height: 12),
              // Price
              TextFormField(
                controller: _priceCtrl,
                decoration: const InputDecoration(
                  labelText: 'Price',
                  hintText: '29.99',
                  prefixIcon: Icon(Icons.attach_money),
                ),
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
              ),
              const SizedBox(height: 12),
              // Notes
              TextFormField(
                controller: _descCtrl,
                decoration: const InputDecoration(
                  labelText: 'Notes (optional)',
                  hintText: 'Size, colour, or other details',
                  prefixIcon: Icon(Icons.notes),
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 12),
              // Wishlist selector
              DropdownButtonFormField<String>(
                initialValue: _selectedWishlistId,
                decoration: const InputDecoration(
                  labelText: 'Add to Wishlist *',
                  prefixIcon: Icon(Icons.list_alt),
                ),
                items: wishlists
                    .map(
                      (w) => DropdownMenuItem(
                        value: w.id,
                        child: Text(
                          w.name,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    )
                    .toList(),
                onChanged: (v) => setState(() => _selectedWishlistId = v),
                hint: const Text('Select a wishlist'),
              ),
              const SizedBox(height: 28),
              ElevatedButton.icon(
                onPressed: _submitting ? null : _submit,
                icon: _submitting
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.add),
                label: Text(_submitting ? 'Adding...' : 'Add to Wishlist'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------

class _PhotoSection extends StatelessWidget {
  final XFile? photo;
  final VoidCallback onCamera;
  final VoidCallback onGallery;

  const _PhotoSection({
    required this.photo,
    required this.onCamera,
    required this.onGallery,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Product Photo',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            // Preview
            if (photo != null)
              Container(
                width: 80,
                height: 80,
                margin: const EdgeInsets.only(right: 12),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey[300]!),
                  image: DecorationImage(
                    image: FileImage(File(photo!.path)),
                    fit: BoxFit.cover,
                  ),
                ),
              )
            else
              Container(
                width: 80,
                height: 80,
                margin: const EdgeInsets.only(right: 12),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey[300]!),
                  color: Colors.grey[100],
                ),
                child: Icon(
                  Icons.image_outlined,
                  size: 36,
                  color: Colors.grey[400],
                ),
              ),
            // Buttons
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                OutlinedButton.icon(
                  icon: const Icon(Icons.camera_alt, size: 18),
                  label: const Text('Take Photo'),
                  onPressed: onCamera,
                ),
                const SizedBox(height: 6),
                OutlinedButton.icon(
                  icon: const Icon(Icons.photo_library, size: 18),
                  label: const Text('Choose Photo'),
                  onPressed: onGallery,
                ),
              ],
            ),
          ],
        ),
      ],
    );
  }
}
