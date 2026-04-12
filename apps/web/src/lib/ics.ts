/**
 * Generate .ics (iCalendar) file content and trigger download.
 *
 * Works for single events or batch export. Compatible with
 * Google Calendar, Apple Calendar, Outlook.
 *
 * Spec: RFC 5545
 */

export interface IcsEvent {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  start: Date;
  /** If no end, defaults to start + 1 hour */
  end?: Date;
  /** All-day event (ignores time) */
  allDay?: boolean;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDate(d: Date, allDay?: boolean): string {
  if (allDay) {
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  }
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function generateIcs(events: IcsEvent[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Toptier OSM//Calendar Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const ev of events) {
    const end = ev.end ?? new Date(ev.start.getTime() + 60 * 60 * 1000);
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.uid}`);
    if (ev.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatDate(ev.start, true)}`);
      lines.push(`DTEND;VALUE=DATE:${formatDate(end, true)}`);
    } else {
      lines.push(`DTSTART:${formatDate(ev.start)}`);
      lines.push(`DTEND:${formatDate(end)}`);
    }
    lines.push(`SUMMARY:${escapeText(ev.title)}`);
    if (ev.description) lines.push(`DESCRIPTION:${escapeText(ev.description)}`);
    if (ev.location) lines.push(`LOCATION:${escapeText(ev.location)}`);
    lines.push(`DTSTAMP:${formatDate(new Date())}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadIcs(events: IcsEvent[], filename: string = 'calendar.ics'): void {
  const content = generateIcs(events);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
