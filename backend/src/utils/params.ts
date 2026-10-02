// Express 5 types route params as `string | string[]`; routes here only
// use single-segment params, so take the first value.
export const getParam = (
  value: string | string[] | undefined,
): string | undefined => (Array.isArray(value) ? value[0] : value);
