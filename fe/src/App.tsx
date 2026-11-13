import { MapContainer, TileLayer } from "react-leaflet";

const INITIAL_CENTER: [number, number] = [45, -75];
const INITIAL_ZOOM = 4;
const TILES_URL =
  "https://api.maptiler.com/maps/dataviz-v4/256/{z}/{x}/{y}.png?key=o9hDdqMys4Vd3IyDnsrt";

function App() {
  return (
    <MapContainer
      center={INITIAL_CENTER}
      zoom={INITIAL_ZOOM}
      className="map"
      attributionControl={false}
      zoomControl={false}
    >
      <TileLayer url={TILES_URL} />
    </MapContainer>
  );
}

export default App;
