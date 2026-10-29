/**
 * Clinic Date Formatter Utility
 * Formats any date input (YYYY-MM-DD, ISO string, epoch ms, or Date object)
 * strictly into the clinic standard format: "22 October 2026"
 */

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Converts date input into "D MMMM YYYY", e.g. "2026-10-22" -> "22 October 2026"
 */
export function formatClinicDate(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '';

  try {
    let year: number;
    let monthIndex: number;
    let day: number;

    if (typeof dateInput === 'string') {
      const trimmed = dateInput.trim();
      // Handle plain YYYY-MM-DD
      const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
      if (ymdMatch) {
        year = parseInt(ymdMatch[1], 10);
        monthIndex = parseInt(ymdMatch[2], 10) - 1;
        day = parseInt(ymdMatch[3], 10);
      } else {
        const d = new Date(trimmed);
        if (isNaN(d.getTime())) return trimmed;
        year = d.getFullYear();
        monthIndex = d.getMonth();
        day = d.getDate();
      }
    } else if (typeof dateInput === 'number') {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return String(dateInput);
      year = d.getFullYear();
      monthIndex = d.getMonth();
      day = d.getDate();
    } else if (dateInput instanceof Date) {
      if (isNaN(dateInput.getTime())) return '';
      year = dateInput.getFullYear();
      monthIndex = dateInput.getMonth();
      day = dateInput.getDate();
    } else {
      return String(dateInput);
    }

    if (monthIndex >= 0 && monthIndex < 12 && day > 0 && day <= 31 && year > 1900) {
      return `${day} ${MONTH_NAMES[monthIndex]} ${year}`;
    }

    return String(dateInput);
  } catch {
    return String(dateInput);
  }
}

/**
 * Formats date and time: e.g. "22 October 2026, 14:30"
 */
export function formatClinicDateTime(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '';
  try {
    const formattedDate = formatClinicDate(dateInput);
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) {
      const timeStr = d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      return `${formattedDate} at ${timeStr}`;
    }
    return formattedDate;
  } catch {
    return formatClinicDate(dateInput);
  }
}
