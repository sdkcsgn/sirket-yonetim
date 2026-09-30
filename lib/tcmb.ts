export type DovizKodu =
  | "USD"
  | "EUR"
  | "GBP"
  | "RUB";

export type TcmbKurlar = {
  tarih: string | null;
  USD: number;
  EUR: number;
  GBP: number;
  RUB: number;
};

function xmlDegeri(
  xml: string,
  currencyCode: DovizKodu,
  tag: "ForexBuying" | "ForexSelling"
) {
  const currencyRegex = new RegExp(
    `<Currency[^>]*CurrencyCode="${currencyCode}"[\\s\\S]*?<${tag}>(.*?)<\\/${tag}>[\\s\\S]*?<\\/Currency>`,
    "i"
  );

  const match = xml.match(currencyRegex);

  if (!match?.[1]) {
    return 0;
  }

  const value = Number(
    match[1]
      .trim()
      .replace(",", ".")
  );

  return Number.isFinite(value)
    ? value
    : 0;
}

export async function tcmbKurlariGetir(): Promise<TcmbKurlar> {
  try {
    const response = await fetch(
      "https://www.tcmb.gov.tr/kurlar/today.xml",
      {
        next: {
          revalidate: 1800,
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `TCMB bağlantı hatası: ${response.status}`
      );
    }

    const xml =
      await response.text();

    const tarihMatch =
      xml.match(
        /<Tarih_Date[^>]*Tarih="([^"]+)"/i
      );

    return {
      tarih:
        tarihMatch?.[1] ?? null,

      USD:
        xmlDegeri(
          xml,
          "USD",
          "ForexBuying"
        ),

      EUR:
        xmlDegeri(
          xml,
          "EUR",
          "ForexBuying"
        ),

      GBP:
        xmlDegeri(
          xml,
          "GBP",
          "ForexBuying"
        ),

      RUB:
        xmlDegeri(
          xml,
          "RUB",
          "ForexBuying"
        ),
    };
  } catch (error) {
    console.error(
      "TCMB kurları alınamadı:",
      error
    );

    return {
      tarih: null,
      USD: 0,
      EUR: 0,
      GBP: 0,
      RUB: 0,
    };
  }
}

export function tlKarsiligi(
  tutar: number,
  paraBirimi:
    | "TRY"
    | "USD"
    | "EUR"
    | "GBP"
    | "RUB",
  kurlar: TcmbKurlar
) {
  if (paraBirimi === "TRY") {
    return tutar;
  }

  return (
    tutar *
    kurlar[paraBirimi]
  );
}