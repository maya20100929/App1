export * from '../../lib/types';

// router wants a default export for files in app/ — provide a noop component
export default function _NotARoute() {
  return null as any;
}
