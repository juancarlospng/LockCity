// No subscription data is read, persisted or forwarded in Phase 1.
export function POST() {
  return Response.json(
    { message: "The city list is not open yet." },
    { status: 503 },
  );
}
