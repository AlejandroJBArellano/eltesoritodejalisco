import type { NextConfig } from "next";

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  {
    protocol: "https",
    hostname: "*.supabase.co",
    pathname: "/storage/v1/object/public/**",
  },
  {
    protocol: "https",
    hostname: "*.amazonaws.com",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "*.s3.*.amazonaws.com",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "*.s3.amazonaws.com",
    pathname: "/**",
  },
];

const customDomain = process.env.AWS_S3_CUSTOM_DOMAIN?.trim()
  .replace(/^https?:\/\//, "")
  .replace(/\/+$/, "");

if (customDomain) {
  remotePatterns.push({
    protocol: "https",
    hostname: customDomain,
    pathname: "/**",
  });
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
};

export default nextConfig;

