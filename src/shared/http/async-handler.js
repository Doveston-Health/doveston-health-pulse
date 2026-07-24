export function asyncHandler(handler) {
  return function handleAsync(request, response, next) {
    return Promise.resolve()
      .then(() => handler(request, response, next))
      .catch(next);
  };
}
