/** Approximate WGS84 → GCJ-02 locally; never modify the imported GPX. */
export function mapCoordinate(latitude: number, longitude: number, provider = 'osm') {
  if (provider !== 'amap' || longitude < 72.004 || longitude > 137.8347 || latitude < 0.8293 || latitude > 55.8271) return { latitude, longitude };
  const x = longitude - 105, y = latitude - 35, pi = Math.PI;
  const common = (20 * Math.sin(6 * x * pi) + 20 * Math.sin(2 * x * pi)) * 2 / 3;
  let lat = -100 + 2*x + 3*y + .2*y*y + .1*x*y + .2*Math.sqrt(Math.abs(x)) + common;
  lat += (20*Math.sin(y*pi) + 40*Math.sin(y*pi/3))*2/3 + (160*Math.sin(y*pi/12) + 320*Math.sin(y*pi/30))*2/3;
  let lon = 300 + x + 2*y + .1*x*x + .1*x*y + .1*Math.sqrt(Math.abs(x)) + common;
  lon += (20*Math.sin(x*pi) + 40*Math.sin(x*pi/3))*2/3 + (150*Math.sin(x*pi/12) + 300*Math.sin(x*pi/30))*2/3;
  const rad = latitude*pi/180, magic = 1 - .006693421622965943*Math.sin(rad)**2, root = Math.sqrt(magic), a = 6378245;
  lat = lat*180/((a*(1-.006693421622965943)/(magic*root))*pi);
  lon = lon*180/((a/root*Math.cos(rad))*pi);
  return { latitude: latitude + lat, longitude: longitude + lon };
}
