import { JsonLd } from "./JsonLd";

type EventSchemaProps = {
  id?: string;
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  url: string;
  location: {
    name: string;
    address: string;
  };
  image?: string[];
};

export function EventSchema({ id = "event-schema", name, description, startDate, endDate, url, location, image }: EventSchemaProps) {
  return (
    <JsonLd
      id={id}
      data={{
        "@context": "https://schema.org",
        "@type": "Event",
        name,
        description,
        startDate,
        ...(endDate ? { endDate } : {}),
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: {
          "@type": "Place",
          name: location.name,
          address: {
            "@type": "PostalAddress",
            streetAddress: location.address
          }
        },
        ...(image?.length ? { image } : {}),
        mainEntityOfPage: url,
        url
      }}
    />
  );
}

type AnnouncementProps = {
  id?: string;
  name: string;
  text: string;
  datePosted: string;
  url: string;
  expires?: string;
  category?: string;
};

export function SpecialAnnouncementSchema({ id = "announcement-schema", name, text, datePosted, url, expires, category }: AnnouncementProps) {
  return (
    <JsonLd
      id={id}
      data={{
        "@context": "https://schema.org",
        "@type": "SpecialAnnouncement",
        name,
        text,
        datePosted,
        ...(expires ? { expires } : {}),
        ...(category ? { category } : {}),
        url
      }}
    />
  );
}
