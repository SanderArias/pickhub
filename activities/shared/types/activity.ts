export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

export type AsyncActionResult<T = void> = Promise<ActionResult<T>>;

export type PageBackHref = { backHref: string };
