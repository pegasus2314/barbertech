import { describe, expect, it } from "vitest";
import { waLink } from "./whatsapp";

describe("waLink", () => {
  it("returns null when there is no phone", () => {
    expect(waLink(null, "hola")).toBeNull();
    expect(waLink(undefined, "hola")).toBeNull();
    expect(waLink("", "hola")).toBeNull();
  });

  it("returns null when the phone has no digits", () => {
    expect(waLink("+--()", "hola")).toBeNull();
  });

  it("strips non-digit characters from the phone", () => {
    const link = waLink("+1 (809) 555-1234", "hola");
    expect(link).toBe("https://wa.me/18095551234?text=hola");
  });

  it("URL-encodes the message, including accents and spaces", () => {
    const link = waLink("8091234567", "Hola, ¿confirmas tu cita?");
    expect(link).toBe(
      "https://wa.me/8091234567?text=Hola%2C%20%C2%BFconfirmas%20tu%20cita%3F",
    );
  });
});
