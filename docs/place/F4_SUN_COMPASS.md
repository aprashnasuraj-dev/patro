# F4 — Sun compass

Client astronomy calculates true-north sunrise/sunset azimuth. Orientation is
explicitly enabled; iOS permission is requested only on the button gesture.
Absolute alpha or iOS heading is used; relative alpha is rejected. Sensor
listeners are cleaned up. Magnetic-heading calibration limitations are shown.
No geolocation/network/storage access beyond saved place; cached assets work
without a connection. Polar no-rise/set displays unavailable.

## Preserved behaviours
- [x] Existing official values, location defaults, controls, CSP and routes.
- [x] No new D1 reads, permission on mount or personal data transfer.

## Validation and rollback
TypeScript and equinox bearing reference pass. Real orientation hardware remains
in the manual matrix. Revert this item or clear saved place; no migration.
