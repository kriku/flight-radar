# Flight Radar frontend

React + TypeScript + Vite + Leaflet (`react-leaflet`).

## Start

```bash
npm install
npm run dev
```

Start the backend in `../be` before you start the frontend. The backend listens at `ws://localhost:4000`.

## Data layer

The app keeps one WebSocket for each backend endpoint. Two providers own the
sockets. Mount them once, near the root (`src/main.tsx`):

```tsx
<PlanesProvider>
  <PlaneProvider>
    <App />
  </PlaneProvider>
</PlanesProvider>
```

### `usePlanesContext()`

Returns the plane list from `/ws/planes/basic`:

```tsx
const { planes, status, error } = usePlanesContext();
```

All components read the same socket.

### `usePlaneContext()`

Returns the selected plane of the whole app, its details from
`/ws/planes/details`, and the selection methods:

```tsx
const { selectedPlaneId, details, status, error, selectPlane, clearSelection } =
  usePlaneContext();

selectPlane("plane-1"); // select a plane
selectPlane(null);      // clear the selection, same as clearSelection()
```

- All components share one selection and one socket.
- The socket opens on the first selection. A new `subscribe` message goes out
  when the selection changes. The socket closes when the selection is cleared.
- The hook returns no data of a previously selected plane.

## Scripts

- `npm run dev`: start the dev server.
- `npm run build`: type-check and build to `dist/`.
- `npm run lint`: run Oxlint.
- `npm run preview`: serve the build output.
