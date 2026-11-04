declare module 'geoip-lite' {
  const geoip: {
    lookup(ip: string): { country?: string } | null;
  };
  export default geoip;
}
