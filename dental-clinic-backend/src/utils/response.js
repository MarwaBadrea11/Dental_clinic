export function successResponse(data, meta = null) {
  return { success: true, data, error: null, meta };
}

export function errorResponse(message, meta = null) {
  return { success: false, data: null, error: message, meta };
}
