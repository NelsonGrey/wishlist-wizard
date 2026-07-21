import { useMemo } from "react";
import { useLocation } from "wouter";
import { Calendar as CalendarComponent, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '@/styles/calendar.css';
import { Wishlist as DbWishlist } from "@wishlist-wizard/shared";
import { getNextOccurrenceDate, parseOccasionDate } from "@/lib/wishlist-dates";

type Wishlist = Omit<DbWishlist, 'id' | 'userId' | 'beneficiaryId'> & {
  id: string | number;
  userId: string | number;
  beneficiaryId?: string | number | null;
  itemCount: number;
};

interface WishlistCalendarViewProps {
  wishlists: Wishlist[];
}

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface WishlistCalendarEvent {
  id: string | number;
  title: string;
  start: Date;
  end: Date;
  wishlist: Wishlist;
}

export default function WishlistCalendarView({ wishlists }: WishlistCalendarViewProps) {
  const [, setLocation] = useLocation();
  const events: WishlistCalendarEvent[] = useMemo(() => {
    return wishlists
      .map((wishlist) => {
        const occasionDate = parseOccasionDate(wishlist.occasionDate);
        if (!occasionDate) return null;
        const date = getNextOccurrenceDate(occasionDate, wishlist.recurrence) || occasionDate;
        const title = wishlist.occasion ? `${wishlist.name} (${wishlist.occasion})` : wishlist.name;
        return { id: wishlist.id, title, start: date, end: date, wishlist };
      })
      .filter((event): event is WishlistCalendarEvent => event !== null);
  }, [wishlists]);

  if (events.length === 0) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-sm border text-center text-gray-500" data-testid="wishlist-calendar-view-empty">
        No wishlists have a planned date yet. Add an occasion date to a wishlist to see it here.
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border" data-testid="wishlist-calendar-view">
      <CalendarComponent
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        className="calendar-container"
        style={{ height: 600 }}
        onSelectEvent={(event: WishlistCalendarEvent) => setLocation(`/app/wishlist/${event.wishlist.id}`)}
      />
    </div>
  );
}
