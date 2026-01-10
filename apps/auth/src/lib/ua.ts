export interface ParsedUA {
  browser: string;
  os: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
}

export function parseUserAgent(uaString: string | undefined): ParsedUA {
  if (!uaString) {
      return { browser: 'Unknown', os: 'Unknown', deviceType: 'unknown' };
  }
  
  const ua = uaString;
  const browser = parseBrowser(ua);
  const os = parseOS(ua);
  const deviceType = parseDeviceType(ua);
  return { browser, os, deviceType };
}

function parseBrowser(ua: string): string {
  if (ua.indexOf("Edg") > -1) return "Edge";
  if (ua.indexOf("Chrome") > -1) return "Chrome";
  if (ua.indexOf("Firefox") > -1) return "Firefox";
  if (ua.indexOf("Safari") > -1 && ua.indexOf("Chrome") === -1) return "Safari";
  return "Other";
}

function parseOS(ua: string): string {
  if (ua.indexOf("Windows") > -1) return "Windows";
  if (ua.indexOf("Mac OS") > -1) return "macOS";
  if (ua.indexOf("Android") > -1) return "Android";
  if (ua.indexOf("iOS") > -1 || ua.indexOf("iPhone") > -1 || ua.indexOf("iPad") > -1) return "iOS";
  if (ua.indexOf("Linux") > -1) return "Linux";
  return "Other";
}

function parseDeviceType(ua: string): 'desktop' | 'mobile' | 'tablet' | 'unknown' {
  if (/iPad|Tablet/i.test(ua)) return 'tablet';
  if (/Mobile/i.test(ua)) return 'mobile';
  if (/Android/i.test(ua) && !/Mobile/i.test(ua)) return 'tablet';
  return 'desktop';
}
