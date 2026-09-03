import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../models/models.dart';
import '../providers/providers.dart';
import '../services/firebase_functions_service.dart';
import 'barcode_scanner_screen.dart';

/// Screen for adding wishlist items via camera, barcode scan/lookup, or URL
/// entry.
///
/// Barcode entry supports live camera scanning (mobile_scanner) with manual
/// entry as a fallback; both paths look the code up server-side via
/// FirebaseFunctionsService.lookupBarcode, which hits
/// packages/functions/src/api/mobile.ts's lookupBarcode through the api
/// router.
class ScanItemScreen extends StatefulWidget {
  const ScanItemScreen({super.key, FirebaseFunctionsService? functionsService})
      : _functionsService = functionsService;

  // Injectable for tests; defaults to the real Firebase-backed singleton.
  final FirebaseFunctionsService? _functionsService;

  @override
  State<ScanItemScreen> createState() => _ScanItemScreenState();
}

class _ScanItemScreenState extends State<ScanItemScreen> {
  late final FirebaseFunctionsService _service =
      widget._functionsService ?? FirebaseFunctionsService();
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _urlCtrl = TextEditingController();
  final _priceCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _storeCtrl = TextEditingController();

  Priority _priority = Priority.medium;
  final _barcodeCtrl = TextEditingController();

  String? _selectedWishlistId;
  bool _submitting = false;
  bool _lookingUpBarcode = false;
  XFile? _photo;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _urlCtrl.dispose();
    _priceCtrl.dispose();
    _descCtrl.dispose();
    _storeCtrl.dispose();
    _barcodeCtrl.dispose();
    super.dispose();
  }

  Future<void> _scanBarcode() async {
    final code = await Navigator.push<String>(
      context,
      MaterialPageRoute(builder: (context) => const BarcodeScannerScreen()),
    );
    if (code == null || !mounted) return;
    _barcodeCtrl.text = code;
    _lookUpBarcode();
  }

  Future<void> _lookUpBarcode() async {
    final barcode = _barcodeCtrl.text.trim();
    if (barcode.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a barcode first')),
      );
      return;
    }

    setState(() => _lookingUpBarcode = true);
    try {
      final result = await _service.lookupBarcode(barcode);
      if (!mounted) return;

      final found = result['found'] == true;
      if (!found) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No product found for that barcode')),
        );
        return;
      }

      final product = result['product'] as Map<String, dynamic>?;
      setState(() {
        if (product?['title'] != null) {
          _nameCtrl.text = product!['title'] as String;
        }
        if (product?['store'] != null) {
          _storeCtrl.text = product!['store'] as String;
        }
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Product found — details filled in below')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Barcode lookup failed: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _lookingUpBarcode = false);
    }
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
      store: _storeCtrl.text.trim().isEmpty ? null : _storeCtrl.text.trim(),
      priority: _priority,
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
              // Barcode lookup section
              Text(
                'Barcode Lookup',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Tooltip(
                    message: 'Scan barcode',
                    child: SizedBox(
                      height: 56,
                      child: OutlinedButton(
                        onPressed: _scanBarcode,
                        style: OutlinedButton.styleFrom(padding: EdgeInsets.zero),
                        child: const Icon(Icons.camera_alt_outlined),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextFormField(
                      controller: _barcodeCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Barcode',
                        hintText: 'e.g. 012345678905',
                        prefixIcon: Icon(Icons.qr_code_scanner),
                      ),
                      keyboardType: TextInputType.number,
                      onFieldSubmitted: (_) => _lookUpBarcode(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    height: 56,
                    child: ElevatedButton(
                      onPressed: _lookingUpBarcode ? null : _lookUpBarcode,
                      child: _lookingUpBarcode
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Look Up'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
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
              // Store
              TextFormField(
                controller: _storeCtrl,
                decoration: const InputDecoration(
                  labelText: 'Store (optional)',
                  hintText: 'e.g. Amazon, REI',
                  prefixIcon: Icon(Icons.storefront_outlined),
                ),
              ),
              const SizedBox(height: 12),
              // Priority
              DropdownButtonFormField<Priority>(
                initialValue: _priority,
                decoration: const InputDecoration(
                  labelText: 'Priority',
                  prefixIcon: Icon(Icons.flag_outlined),
                ),
                items: const [
                  DropdownMenuItem(value: Priority.low, child: Text('Low')),
                  DropdownMenuItem(
                    value: Priority.medium,
                    child: Text('Medium'),
                  ),
                  DropdownMenuItem(value: Priority.high, child: Text('High')),
                ],
                onChanged: (v) =>
                    setState(() => _priority = v ?? Priority.medium),
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
