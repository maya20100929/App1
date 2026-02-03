export * from '../../lib/testDateStore';

// This file lived under app/(lib) which is scanned by the router as a route.
// Re-export the implementation from /lib and provide a default component
// so that the router does not complain about missing default export.
export default function _NotARoute() {
  return null as any;
}
