import { describe, it, expect } from "vitest";
import { parseHostPort, isValidPort, buildUrl, portToUrl } from "./uri";

describe("parseHostPort", () => {
  it("parses host:port", () => {
    expect(parseHostPort("localhost:8080")).toEqual({ host: "localhost", port: 8080 });
  });

  it("parses bare port", () => {
    expect(parseHostPort("8080")).toEqual({ host: "", port: 8080 });
  });

  it("returns null for non-numeric port", () => {
    expect(parseHostPort("localhost:abc")).toBeNull();
    expect(parseHostPort("bad")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseHostPort("")).toBeNull();
  });

  it("returns null for out-of-range port", () => {
    expect(parseHostPort("0")).toBeNull();
    expect(parseHostPort("65536")).toBeNull();
  });

  it("handles IPv6-style brackets", () => {
    expect(parseHostPort("[::1]:9090")).toEqual({ host: "[::1]", port: 9090 });
  });
});

describe("isValidPort", () => {
  it("accepts 1–65535", () => {
    expect(isValidPort(1)).toBe(true);
    expect(isValidPort(65535)).toBe(true);
    expect(isValidPort(8080)).toBe(true);
  });

  it("rejects 0 and above 65535", () => {
    expect(isValidPort(0)).toBe(false);
    expect(isValidPort(65536)).toBe(false);
  });

  it("accepts numeric strings", () => {
    expect(isValidPort("8080")).toBe(true);
  });

  it("rejects non-numeric strings", () => {
    expect(isValidPort("abc")).toBe(false);
  });
});

describe("buildUrl", () => {
  it("omits default port for https", () => {
    expect(buildUrl({ scheme: "https", host: "example.com", port: 443 })).toBe("https://example.com");
  });

  it("omits default port for http", () => {
    expect(buildUrl({ scheme: "http", host: "example.com", port: 80 })).toBe("http://example.com");
  });

  it("includes non-default port", () => {
    expect(buildUrl({ scheme: "http", host: "localhost", port: 8080 })).toBe("http://localhost:8080");
  });

  it("appends path", () => {
    expect(buildUrl({ scheme: "http", host: "localhost", port: 8080, path: "/api" })).toBe("http://localhost:8080/api");
  });
});

describe("portToUrl", () => {
  it("builds http URL for a port", () => {
    expect(portToUrl(8080)).toBe("http://localhost:8080");
  });

  it("accepts custom scheme", () => {
    expect(portToUrl(8443, "https")).toBe("https://localhost:8443");
  });
});
