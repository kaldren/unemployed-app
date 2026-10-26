import { describe, expect, it } from "vitest";
import { buildVettingPrompt, htmlToText, isFetchableHost, isPublicIp, isReservedDomain, PAGE_TEXT_MAX } from "./vetting-prompt";

describe("isReservedDomain", () => {
  it("matches documentation and special-use domains", () => {
    for (const d of ["example.com", "mail.example.org", "acme.test", "foo.localhost", "x.invalid"]) {
      expect(isReservedDomain(d)).toBe(true);
    }
  });

  it("leaves real domains alone", () => {
    expect(isReservedDomain("acme.com")).toBe(false);
    expect(isReservedDomain("myexample.com")).toBe(false);
  });
});

describe("isFetchableHost", () => {
  it("accepts public hostnames", () => {
    expect(isFetchableHost("acme.com")).toBe(true);
    expect(isFetchableHost("www.acme-labs.co.uk")).toBe(true);
  });

  it("refuses IPs, ports, credentials and internal names", () => {
    for (const h of ["127.0.0.1", "169.254.169.254", "acme.com:8080", "user@acme.com", "localhost", "db.internal", "acme"]) {
      expect(isFetchableHost(h)).toBe(false);
    }
  });
});

describe("htmlToText", () => {
  it("keeps title, description and body text, without scripts or tags", () => {
    const html = `<html><head><title>Acme &amp; Co</title><meta name="description" content="We make rockets">
      <style>body{}</style></head><body><script>alert(1)</script><h1>Hello</h1><p>World&nbsp;!</p></body></html>`;
    expect(htmlToText(html)).toBe("Acme & Co\nWe make rockets\nHello World !");
  });

  it("caps the length", () => {
    expect(htmlToText(`<p>${"a ".repeat(PAGE_TEXT_MAX)}</p>`)).toHaveLength(PAGE_TEXT_MAX);
  });
});

describe("buildVettingPrompt", () => {
  it("wraps page text and says when the page couldn't load", () => {
    expect(buildVettingPrompt("acme.com", "Acme", "Rockets")).toContain("<page>\nRockets\n</page>");
    expect(buildVettingPrompt("acme.com", "Acme", null)).toContain("couldn't be loaded");
  });
});

describe("isPublicIp", () => {
  it("refuses private, local and metadata addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"]) {
      expect(isPublicIp(ip)).toBe(false);
    }
  });

  it("accepts public addresses", () => {
    for (const ip of ["93.184.216.34", "172.32.0.1", "2606:4700::1111", "::ffff:8.8.8.8"]) expect(isPublicIp(ip)).toBe(true);
  });
});
