import { JsonLd } from "./JsonLd";

type FxProps = {
  id?: string;
  currency: string;
  rate: number;
  baseCurrency: string;
  updatedAt: string;
  url: string;
};

export function ExchangeRateSchema({ id = "fx-schema", currency, rate, baseCurrency, updatedAt, url }: FxProps) {
  return (
    <JsonLd
      id={id}
      data={{
        "@context": "https://schema.org",
        "@type": "ExchangeRateSpecification",
        currency,
        currentExchangeRate: {
          "@type": "UnitPriceSpecification",
          price: rate,
          priceCurrency: baseCurrency,
          validFrom: updatedAt
        },
        url
      }}
    />
  );
}

type BullionProps = {
  id?: string;
  name: string;
  price: number;
  currency: string;
  updatedAt: string;
  url: string;
};

export function BullionProductSchema({ id = "bullion-schema", name, price, currency, updatedAt, url }: BullionProps) {
  return (
    <JsonLd
      id={id}
      data={{
        "@context": "https://schema.org",
        "@type": "Product",
        name,
        url,
        offers: {
          "@type": "Offer",
          price,
          priceCurrency: currency,
          availability: "https://schema.org/InStock",
          priceValidUntil: updatedAt.slice(0, 10),
          url
        }
      }}
    />
  );
}
