import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';

class ErrorBoundary extends StatefulWidget {
  final Widget child;
  final Widget Function(Object error, StackTrace? stackTrace)? errorBuilder;
  final void Function(Object error, StackTrace? stackTrace)? onError;

  const ErrorBoundary({
    super.key,
    required this.child,
    this.errorBuilder,
    this.onError,
  });

  @override
  State<ErrorBoundary> createState() => _ErrorBoundaryState();
}

class _ErrorBoundaryState extends State<ErrorBoundary> {
  Object? _error;
  StackTrace? _stackTrace;

  @override
  void initState() {
    super.initState();
    _error = null;
    _stackTrace = null;
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      if (widget.errorBuilder != null) {
        return widget.errorBuilder!(_error!, _stackTrace);
      }
      return _DefaultErrorWidget(
        error: _error!,
        stackTrace: _stackTrace,
        onRetry: () {
          setState(() {
            _error = null;
            _stackTrace = null;
          });
        },
      );
    }

    return ErrorWidgetBuilder(
      onError: (error, stackTrace) {
        if (kDebugMode) {
          debugPrint('[ErrorBoundary] Caught error: $error');
          debugPrint('[ErrorBoundary] Stack trace: $stackTrace');
        }

        setState(() {
          _error = error;
          _stackTrace = stackTrace;
        });

        widget.onError?.call(error, stackTrace);
      },
      child: widget.child,
    );
  }
}

class _DefaultErrorWidget extends StatelessWidget {
  final Object error;
  final StackTrace? stackTrace;
  final VoidCallback onRetry;

  const _DefaultErrorWidget({
    required this.error,
    required this.stackTrace,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 64, color: Colors.red),
                const SizedBox(height: 16),
                Text(
                  'Something went wrong',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  error.toString(),
                  style: TextStyle(color: Colors.grey[600]),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: onRetry,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Try Again'),
                ),
                const SizedBox(height: 16),
                if (kDebugMode)
                  ExpansionTile(
                    title: const Text('Error Details (Debug)'),
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Text(
                          stackTrace.toString(),
                          style: const TextStyle(
                            fontFamily: 'monospace',
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class ErrorWidgetBuilder extends SingleChildRenderObjectWidget {
  final void Function(Object error, StackTrace? stackTrace) onError;

  const ErrorWidgetBuilder({
    super.key,
    required this.onError,
    required Widget child,
  }) : super(child: child);

  @override
  RenderObject createRenderObject(BuildContext context) {
    return _ErrorRenderObjectWidget(onError: onError);
  }

  @override
  void updateRenderObject(BuildContext context, RenderObject renderObject) {
    final errorRenderObject = renderObject as _ErrorRenderObjectWidget;
    errorRenderObject.onError = onError;
  }
}

class _ErrorRenderObjectWidget extends RenderProxyBox {
  void Function(Object error, StackTrace? stackTrace) onError;

  _ErrorRenderObjectWidget({required this.onError, RenderBox? child})
    : super(child);

  @override
  void performLayout() {
    try {
      super.performLayout();
    } catch (error, stackTrace) {
      onError(error, stackTrace);
    }
  }

  @override
  void paint(PaintingContext context, Offset offset) {
    try {
      super.paint(context, offset);
    } catch (error, stackTrace) {
      onError(error, stackTrace);
    }
  }
}
