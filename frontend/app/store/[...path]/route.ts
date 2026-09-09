// External proxying is disabled for Phase 1, regardless of environment.
function unavailable() {
  return Response.json(
    { message: "The store connection is unavailable." },
    { status: 503 },
  );
}
export const GET = unavailable;
export const POST = unavailable;
export const PUT = unavailable;
export const DELETE = unavailable;
