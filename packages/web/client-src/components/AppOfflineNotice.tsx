interface AppOfflineNoticeProps {
  title?: string;
}

/**
 * Shown in place of sign-in/sign-up forms and authenticated app content when
 * the app_offline Remote Config flag is on (see hooks/useAppOffline) — a
 * pre-launch window or a maintenance outage. Communicates the state instead
 * of a silent redirect or a dead-end form.
 */
export default function AppOfflineNotice({
  title = 'Wishlist Wizard is not available right now',
}: AppOfflineNoticeProps) {
  return (
    <div className="max-w-md mx-auto my-16 bg-white rounded-xl shadow-sm p-6 border border-gray-200 text-center">
      <h1 className="font-bold text-2xl text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-600">
        We're not accepting sign-ins or new accounts at the moment. Please
        check back soon.
      </p>
    </div>
  );
}
